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

    let commentFailureBody = "";
    if (fs.existsSync(errorMessageFilePath)) {
        const errorMessageToReport = fs.readFileSync(errorMessageFilePath, 'utf8');
        commentFailureBody = "🚨 Failure 🚨 :bangbang: ⛔️ Please check the following error  ⛔️ :bangbang: \n```" + errorMessageToReport + "```";
    } else {
        commentFailureBody = "🚨 Failed to trigger a test on TestIO 🚨 Please revise your steps";
    }
    commentFailureBody = commentFailureBody.concat(`\n\nAs response to [test creation trigger](${createCommentUrl}).`);

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    await octokit.rest.issues.createComment({
        repo: github.context.repo.repo,
        owner: github.context.repo.owner,
        issue_number: github.context.issue.number,
        body: commentFailureBody
    });

}

reportFailure().then();