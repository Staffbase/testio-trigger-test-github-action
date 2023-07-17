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
import * as github from "@actions/github";
import * as core from "@actions/core";
import {Util} from "./Util";
import betterAjvErrors from "better-ajv-errors";

export class TestIOTriggerTestGHA {

    private static readonly persistedPayloadFile = 'resources/testio_payload.json';

    private readonly _githubToken?: string;
    private readonly _owner?: string;
    private readonly _repo?: string;
    private readonly _pr?: number;
    private readonly _actionRootDir: string;
    private readonly _errorFileName: string;
    private readonly _testioProductId?: string;
    private readonly _testioToken?: string;

    // instantiation via constructor only allowed from within this class
    private constructor(githubToken: undefined | string, owner: undefined | string, repo: undefined | string, pr: undefined | number, actionRootDir: string, errorFileName: string, testioProductId?: string, testioToken?: string) {
        this._githubToken = githubToken;
        this._repo = repo;
        this._pr = pr;
        this._actionRootDir = actionRootDir;
        this._owner = owner;
        this._errorFileName = errorFileName;
        this._testioProductId = testioProductId;
        this._testioToken = testioToken;
    }

    public static createForGithub(githubToken: string, owner: string, repo: string, pr: number, actionRootDir: string, errorFileName: string) {
        return new TestIOTriggerTestGHA(githubToken, owner, repo, pr, actionRootDir, errorFileName);
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
        return new TestIOTriggerTestGHA(undefined, undefined, undefined, undefined, actionRootDir, errorFileName, testioProductId, testioToken);
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

    public get errorFileName() {
        return this._errorFileName;
    }

    public get testioProductId() {
        return this._testioProductId;
    }

    public get testioToken() {
        return this._testioToken;
    }

    public async addPrepareComment(commentPrepareTemplateFileName: string, commentPrepareJsonFileName: string, createCommentUrl: string): Promise<string> {
        if (!(this.githubToken && this.repo && this.owner && this.pr)) {
            const errorMessage = "Github properties are not configured";
            Util.throwErrorAndPrepareErrorMessage(errorMessage, this.errorFileName);
            return Promise.reject(errorMessage);
        }

        const commentPrepareTemplateFile = `${this._actionRootDir}/resources/${commentPrepareTemplateFileName}`;
        const commentTemplate = fs.readFileSync(commentPrepareTemplateFile, 'utf8');

        const commentPrepareJsonFile = `${this._actionRootDir}/resources/${commentPrepareJsonFileName}`;
        const jsonString = fs.readFileSync(commentPrepareJsonFile, 'utf8');

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
            Util.throwErrorAndPrepareErrorMessage(errorMessage, this.errorFileName);
            return Promise.reject(errorMessage);
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
        if (!commentContents) Util.throwErrorAndPrepareErrorMessage(`Comment ${submitCommentUrl} seems to be empty`, this.errorFileName);
        return commentContents;
    }

    public retrieveValidPrepareObjectFromComment(retrievedComment: string): any {
        let preparation: any;
        try {
            preparation = Util.retrievePrepareObjectFromComment(retrievedComment);
        } catch (error) {
            if (error instanceof Error) {
                Util.throwErrorAndPrepareErrorMessage(error.message, this.errorFileName);
            }
            Util.throwErrorAndPrepareErrorMessage(String(error), this.errorFileName);
        }

        const prepareTestSchemaFile = `${this.actionRootDir}/resources/exploratory_test_comment_prepare_schema.json`;
        const {valid, validation} = Util.validateObjectAgainstSchema(preparation, prepareTestSchemaFile);
        if (!valid) {
            if (validation.errors) {
                const output = betterAjvErrors(prepareTestSchemaFile, preparation, validation.errors);
                console.log(output);
                Util.throwErrorAndPrepareErrorMessage(`Provided json is not conform to schema: ${output}`, this.errorFileName);
            }
            Util.throwErrorAndPrepareErrorMessage("Provided json is not conform to schema", this.errorFileName);
        }

        return preparation;
    }

    public async retrievePrTitle(): Promise<string> {
        if (!(this.githubToken && this.repo && this.owner && this.pr)) {
            const errorMessage = "Github properties are not configured";
            Util.throwErrorAndPrepareErrorMessage(errorMessage, this.errorFileName);
            return Promise.reject(errorMessage);
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
            Util.throwErrorAndPrepareErrorMessage("Could not retrieve title of the PR", this.errorFileName);
        }
        return prTitle;
    }

    public createAndPersistTestIoPayload(prepareObject: any, prTitle: string): any {
        if (!(this.repo && this.owner && this.pr)) {
            const errorMessage = "Github properties are not configured";
            Util.throwErrorAndPrepareErrorMessage(errorMessage, this.errorFileName);
            return Promise.reject(errorMessage);
        }

        const testIOPayload = Util.convertPrepareObjectToTestIOPayload(
            prepareObject,
            this.repo,
            this.owner,
            this.pr,
            prTitle
        );
        console.log("Converted payload:");
        console.log(testIOPayload);
        const payloadFile = `${this.actionRootDir}/${TestIOTriggerTestGHA.persistedPayloadFile}`;
        fs.writeFileSync(payloadFile, JSON.stringify(testIOPayload));
        return testIOPayload;
    }

    public async triggerTestIoTest(): Promise<any> {
        if (!(this.testioToken && this.testioProductId)) {
            const errorMessage = "TestIO properties are not configured";
            Util.throwErrorAndPrepareErrorMessage(errorMessage, this.errorFileName);
            return Promise.reject(errorMessage);
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