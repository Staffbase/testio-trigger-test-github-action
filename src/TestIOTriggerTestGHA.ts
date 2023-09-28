/*
 * Copyright 2023 - 2023, Staffbase GmbH and contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from "fs";
import {Octokit} from "@octokit/rest";
import * as core from "@actions/core";
import {Util} from "./Util";
import betterAjvErrors from "better-ajv-errors";
import * as path from "path";
import {TestIOUtil} from "./TestIOUtil";

export class TestIOTriggerTestGHA {

    public static readonly CREATE_COMMENT_PREFIX = "@bot-testio exploratory-test create ";

    public static readonly persistedPayloadFile = 'temp/testio_payload.json';
    private static readonly commentPrepareTemplateFile = "exploratory_test_comment_prepare_template.md";
    private static readonly commentPrepareDefaultJsonFile = "exploratory_test_comment_prepare_default.json";

    private _githubToken?: string;
    private _owner?: string;
    private _repo?: string;
    private _pr?: number;
    private readonly _actionRootDir: string;
    private readonly _errorFile: string;
    private _testioProductId?: string;
    private _testioToken?: string;

    // instantiation via constructor only allowed from within this class
    private constructor(actionRootDir: string, errorFileName: string) {
        this._actionRootDir = actionRootDir;
        this._errorFile = errorFileName;
    }

    public static createForGithub(githubToken: string, owner: string, repo: string, pr: number, actionRootDir: string, errorFileName: string): TestIOTriggerTestGHA {
        const gha = new TestIOTriggerTestGHA(actionRootDir, errorFileName);
        gha._githubToken = githubToken;
        gha._owner = owner;
        gha._repo = repo;
        gha._pr = pr;
        return gha;
    }


    /**
     * This factory method creates an instance of this class and leaves those properties related to Github uninstantiated.
     * The intention is to make instantiation of this class easier when the use case doesn't demand for communicating
     * to the Github API.
     *
     * @param testioProductId
     * @param testioToken
     * @param actionRootDir
     * @param errorFileName
     */
    public static createForTestIO(testioProductId: string, testioToken: string, actionRootDir: string, errorFileName: string) {
        const gha = new TestIOTriggerTestGHA(actionRootDir, errorFileName);
        gha._testioProductId = testioProductId;
        gha._testioToken = testioToken;
        return gha;
    }

    public get githubToken() {
        return this._githubToken;
    }

    public get owner() {
        return this._owner;
    }

    public get repo() {
        return this._repo;
    }

    public get pr() {
        return this._pr;
    }

    public get actionRootDir() {
        return this._actionRootDir;
    }

    public get errorFile() {
        return `${this.actionRootDir}/${this._errorFile}`;
    }

    public get testioProductId() {
        return this._testioProductId;
    }

    public get testioToken() {
        return this._testioToken;
    }

    public async addPrepareComment(createCommentUrl: string, createCommentBody: string): Promise<string> {
        if (!(this.githubToken && this.repo && this.owner && this.pr)) {
            const errorMessage = "Github properties are not configured";
            const error = Util.prepareErrorMessageAndOptionallyThrow(errorMessage, this.errorFile, true);
            return Promise.reject(error);
        }

        const commentPrepareTemplateFile = `${this.actionRootDir}/resources/${TestIOTriggerTestGHA.commentPrepareTemplateFile}`;
        const commentTemplate = fs.readFileSync(commentPrepareTemplateFile, 'utf8');

        let device: any = null;
        const commentSuffix = createCommentBody.replace(TestIOTriggerTestGHA.CREATE_COMMENT_PREFIX, "").trim();

        if (commentSuffix) {
            const deviceSpecParts = commentSuffix.split(/\s+/);
            const osName = deviceSpecParts[0];
            const categoryName = (deviceSpecParts[1] ? deviceSpecParts[1] : "smartphones");
            device = {
                    os: osName,
                    category: categoryName,
                    min: "8.0",
                    max: "10"
            };
        }

        const commentPrepareJsonFile = `${this.actionRootDir}/resources/${TestIOTriggerTestGHA.commentPrepareDefaultJsonFile}`;
        let jsonString = fs.readFileSync(commentPrepareJsonFile, 'utf8');
        let jsonObject = JSON.parse(jsonString);
        if (device) {
            jsonObject = {
                ...jsonObject,
                device
            };
        }
        jsonString = JSON.stringify(jsonObject, null, 2);

        const requiredInformationPlaceholder = "$$REQUIRED_INFORMATION_TEMPLATE$$";
        const createCommentPlaceholder = "$$CREATE_COMMENT_URL$$";
        const commentBody = commentTemplate.replace(requiredInformationPlaceholder, jsonString).replace(createCommentPlaceholder, createCommentUrl);

        const octokit = new Octokit({
            auth: this.githubToken
        });

        await octokit.rest.issues.createComment({
            repo: this.repo,
            owner: this.owner,
            issue_number: this.pr,
            body: commentBody,
        });
        return commentBody;
    }

    public async retrieveCommentContent(submitCommentID: number, submitCommentUrl: string): Promise<string> {
        if (!(this.githubToken && this.repo && this.owner && this.pr)) {
            const errorMessage = "Github properties are not configured";
            const error = Util.prepareErrorMessageAndOptionallyThrow(errorMessage, this.errorFile, true);
            return Promise.reject(error);
        }

        const octokit = new Octokit({
            auth: this.githubToken
        });

        const retrievedComment = await octokit.rest.issues.getComment({
            repo: this.repo,
            owner: this.owner,
            comment_id: submitCommentID
        });
        core.setOutput("testio-submit-comment-id", submitCommentID);

        const commentContents = `${retrievedComment.data.body}`;
        if (!commentContents) Util.prepareErrorMessageAndOptionallyThrow(`Comment ${submitCommentUrl} seems to be empty`, this.errorFile);
        return commentContents;
    }

    public retrieveValidPrepareObjectFromComment(retrievedComment: string): any {
        let preparation: any;
        try {
            preparation = Util.retrievePrepareObjectFromComment(retrievedComment);
        } catch (error) {
            if (error instanceof Error) {
                Util.prepareErrorMessageAndOptionallyThrow(error.message, this.errorFile);
            }
            Util.prepareErrorMessageAndOptionallyThrow(String(error), this.errorFile);
        }

        const prepareTestSchemaFile = `${this.actionRootDir}/resources/exploratory_test_comment_prepare_schema.json`;
        const {valid, validation} = Util.validateObjectAgainstSchema(preparation, prepareTestSchemaFile);
        if (!valid) {
            if (validation.errors) {
                const output = betterAjvErrors(prepareTestSchemaFile, preparation, validation.errors);
                Util.prepareErrorMessageAndOptionallyThrow(`Provided json is not conform to schema: ${output}`, this.errorFile);
            }
            Util.prepareErrorMessageAndOptionallyThrow("Provided json is not conform to schema", this.errorFile);
        }

        return preparation;
    }

    public async retrievePrTitle(): Promise<string> {
        if (!(this.githubToken && this.repo && this.owner && this.pr)) {
            const errorMessage = "Github properties are not configured";
            const error = Util.prepareErrorMessageAndOptionallyThrow(errorMessage, this.errorFile, true);
            return Promise.reject(error);
        }

        const octokit = new Octokit({
            auth: this.githubToken
        });

        const pullRequest = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
            owner: this.owner,
            repo: this.repo,
            pull_number: this.pr,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        const prTitle = pullRequest.data.title;
        if (!prTitle) {
            console.log("The pull request received:");
            console.log(JSON.stringify(pullRequest, null, 2));
            const error = Util.prepareErrorMessageAndOptionallyThrow("Could not retrieve title of the PR", this.errorFile, true);
            return Promise.reject(error);
        }
        return prTitle;
    }

    public async createAndPersistTestIoPayload(prepareObject: any, prTitle: string): Promise<any> {
        if (!(this.repo && this.owner && this.pr)) {
            const errorMessage = "Github properties are not configured";
            const error = Util.prepareErrorMessageAndOptionallyThrow(errorMessage, this.errorFile, true);
            return Promise.reject(error);
        }

        const testIOPayload = await TestIOUtil.convertPrepareObjectToTestIOPayload(
            prepareObject,
            this.repo,
            this.owner,
            this.pr,
            prTitle
        );
        console.log("Converted payload:");
        console.log(testIOPayload);
        const payloadFile = `${this.actionRootDir}/${TestIOTriggerTestGHA.persistedPayloadFile}`;
        const payloadDir = path.parse(payloadFile).dir;
        if (!fs.existsSync(payloadDir)) {
            fs.mkdirSync(payloadDir, {recursive: true});
            console.log("Create path: " + payloadDir);
        }
        fs.writeFileSync(payloadFile, JSON.stringify(testIOPayload));
        return testIOPayload;
    }

    public async triggerTestIoTest(): Promise<any> {
        if (!(this.testioToken && this.testioProductId)) {
            const errorMessage = "TestIO properties are not configured";
            const error = Util.prepareErrorMessageAndOptionallyThrow(errorMessage, this.errorFile, true);
            return Promise.reject(error);
        }

        const payloadFile = `${this.actionRootDir}/${TestIOTriggerTestGHA.persistedPayloadFile}`;

        const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));
        console.log("Payload:");
        console.log(payload);

        const endpoint = `https://api.test.io/customer/v2/products/${this.testioProductId}/exploratory_tests`;
        const createdTest = await Util.request("POST", endpoint, this.testioToken, payload);
        console.log("Created test with id: " + createdTest.exploratory_test.id)
        core.setOutput("testio-created-test-id", createdTest.exploratory_test.id);
        return createdTest;
    }
}