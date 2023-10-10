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
import {Util} from "./Util";
import * as fs from "fs";
import {TestIOTriggerTestGHA} from "./TestIOTriggerTestGHA";

async function createPayload() {
    const submitCommentID: number = Number(process.env.TESTIO_SUBMIT_COMMENT_ID);
    const submitCommentUrl = `${process.env.TESTIO_SUBMIT_COMMENT_URL}`;
    const errorFileName = `${process.env.TESTIO_ERROR_MSG_FILE}`;

    const gha = TestIOTriggerTestGHA.createForGithub(
        `${process.env.GITHUB_TOKEN}`,
        github.context.repo.owner,
        github.context.repo.repo,
        github.context.issue.number,
        `${process.env.TESTIO_SCRIPTS_DIR}`,
        errorFileName
    );
    const commentContents = await gha.retrieveCommentContent(submitCommentID, submitCommentUrl);

    // TODO move this part into gha.retrieveCommentConent
    const triggerCommentUrl = Util.getUrlFromComment(commentContents);
    if (triggerCommentUrl != undefined) {
        core.setOutput("testio-create-comment-url", triggerCommentUrl);
    } else {
        core.setOutput("testio-create-comment-url", "");
    }

    const prepareObject = gha.retrieveValidPrepareObjectFromComment(commentContents);
    const prTitle: string = await gha.retrievePrTitle();
    await gha.createAndPersistTestIoPayload(prepareObject, prTitle);
}

createPayload().then();