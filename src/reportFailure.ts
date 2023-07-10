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
import * as fs from "fs";
import {Octokit} from "@octokit/rest";

async function reportFailure() {
    const errorFileName = `${process.env.TESTIO_ERROR_MSG_FILE}`;
    const errorMessageFilePath = `${process.env.TESTIO_SCRIPTS_DIR}/resources/${errorFileName}`;
    const createCommentUrl = `${process.env.TESTIO_CREATE_COMMENT_URL}`;

    const payloadFile = `${process.env.TESTIO_SCRIPTS_DIR}/resources/testio_payload.json`;
    const payloadString = JSON.stringify(JSON.parse(fs.readFileSync(payloadFile, 'utf8')), null, 2);

    let commentErrorMessage = "";
    if (fs.existsSync(errorMessageFilePath)) {
        const errorMessageToReport = fs.readFileSync(errorMessageFilePath, 'utf8');
        commentErrorMessage = "🚨 Failure 🚨 :bangbang: ⛔️ Please check the following error  ⛔️ :bangbang: \n\n```" + errorMessageToReport + "```";
    } else {
        commentErrorMessage = "🚨 Failed to trigger a test on TestIO 🚨 Please revise your steps";
    }

    const commentFailureTemplateFile = `${process.env.TESTIO_SCRIPTS_DIR}/resources/exploratory_test_comment_failure_template.md`;
    const commentFailureTemplate = fs.readFileSync(commentFailureTemplateFile, 'utf8');
    const commentErrorMessagePlaceholder = "$$ERROR_MESSAGE$$";
    const sentPayloadPlaceholder = "$$SENT_PAYLOAD$$";
    const createCommentUrlPlaceholder = "$$CREATE_COMMENT_URL$$";
    const failureCommentBody = commentFailureTemplate.replace(commentErrorMessagePlaceholder, commentErrorMessage).replace(sentPayloadPlaceholder, payloadString).replace(createCommentUrlPlaceholder, createCommentUrl);

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    await octokit.rest.issues.createComment({
        repo: github.context.repo.repo,
        owner: github.context.repo.owner,
        issue_number: github.context.issue.number,
        body: failureCommentBody
    });

}

reportFailure().then();