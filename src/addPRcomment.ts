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
import {TestIOTriggerTestGHA} from "./TestIOTriggerTestGHA";

async function addComment() {
    const errorFileName = `${process.env.TESTIO_ERROR_MSG_FILE}`;

    // TODO handle provided context (default, android, ios)
    const context = process.argv[2]
    console.log("Given context: " + context);

    const gha = TestIOTriggerTestGHA.createForGithub(
        `${process.env.GITHUB_TOKEN}`,
        github.context.repo.owner,
        github.context.repo.repo,
        github.context.issue.number,
        `${process.env.TESTIO_SCRIPTS_DIR}`,
        errorFileName
    );
    const commentPrepareTemplateFile = "exploratory_test_comment_prepare_template.md";
    const commentPrepareJsonFile = "exploratory_test_comment_prepare.json";

    await gha.addPrepareComment(commentPrepareTemplateFile, commentPrepareJsonFile, `${process.env.TESTIO_CREATE_COMMENT_URL}`);
}

addComment().then();