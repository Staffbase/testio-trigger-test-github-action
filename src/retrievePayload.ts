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

import * as github from "@actions/github";
import * as core from "@actions/core";
import {Octokit} from "@octokit/rest";
import {Util} from "./Util";
import betterAjvErrors from "better-ajv-errors";
import * as fs from "fs";
import {TestIOTriggerTestGHA} from "./TestIOTriggerTestGHA";

async function createPayload() {
    const submitCommentID: number = Number(process.env.TESTIO_SUBMIT_COMMENT_ID);
    const submitCommentUrl = `${process.env.TESTIO_SUBMIT_COMMENT_URL}`;
    const errorFileName = `${process.env.TESTIO_ERROR_MSG_FILE}`;

    const gha = TestIOTriggerTestGHA.create(
        `${process.env.GITHUB_TOKEN}`,
        github.context.repo.owner,
        github.context.repo.repo,
        github.context.issue.number,
        `${process.env.TESTIO_SCRIPTS_DIR}`
    );
    const commentContents = await gha.retrieveCommentContent(submitCommentID, submitCommentUrl, errorFileName);

    const triggerCommentUrl = Util.getUrlFromComment(commentContents);
    if (triggerCommentUrl != undefined) {
        core.setOutput("testio-create-comment-url", triggerCommentUrl);
    } else {
        core.setOutput("testio-create-comment-url", "");
    }

    let preparation: any;
    try {
        preparation = Util.retrievePrepareObjectFromComment(commentContents);
    } catch (error) {
        if (error instanceof Error) {
            Util.throwErrorAndPrepareErrorMessage(error.message, errorFileName);
        }
        Util.throwErrorAndPrepareErrorMessage(String(error), errorFileName);
    }

    const prepareTestSchemaFile = `${process.env.TESTIO_SCRIPTS_DIR}/resources/exploratory_test_comment_prepare_schema.json`;
    const {valid, validation} = Util.validateObjectAgainstSchema(preparation, prepareTestSchemaFile);
    if (!valid) {
        if (validation.errors) {
            const output = betterAjvErrors(prepareTestSchemaFile, preparation, validation.errors);
            console.log(output);
            Util.throwErrorAndPrepareErrorMessage(`Provided json is not conform to schema: ${output}`, errorFileName);
        }
        Util.throwErrorAndPrepareErrorMessage("Provided json is not conform to schema", errorFileName);
    }

    const pullRequest = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: github.context.issue.number,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })
    const prTitle = pullRequest.data.title;
    if (!prTitle) {
        console.log("The pull request received:");
        console.log(JSON.stringify(pullRequest, null, 2));
        Util.throwErrorAndPrepareErrorMessage("Could not retrieve title of the PR", errorFileName);
    }

    const testIOPayload = Util.convertPrepareObjectToTestIOPayload(preparation, github.context.repo.repo, github.context.repo.owner, github.context.issue.number, prTitle);
    console.log("Converted payload:");
    console.log(testIOPayload);
    const payloadFile = `${process.env.TESTIO_SCRIPTS_DIR}/resources/testio_payload.json`;
    await fs.writeFile(payloadFile, JSON.stringify(testIOPayload), (err) => {
        if (err) Util.throwErrorAndPrepareErrorMessage(err.message, errorFileName);
        console.log(`The payload file ${payloadFile} has been saved successfully`);
    });
}

createPayload().then();