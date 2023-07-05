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

async function addComment() {
    const commentPrepareTemplateFile = `${process.env.TESTIO_SCRIPTS_DIR}/resources/exploratory_test_comment_prepare_template.md`;
    const commentTemplate = fs.readFileSync(commentPrepareTemplateFile, 'utf8');

    const commentPrepareJsonFile = `${process.env.TESTIO_SCRIPTS_DIR}/resources/exploratory_test_comment_prepare.json`;
    const jsonString = fs.readFileSync(commentPrepareJsonFile, 'utf8');

    const createCommentUrl = `${process.env.TESTIO_CREATE_COMMENT_URL}`;
    const requiredInformationPlaceholder = "$$REQUIRED_INFORMATION_TEMPLATE$$";
    const createCommentPlaceholder = "$$CREATE_COMMENT_URL$$";
    const commentBody = commentTemplate.replace(requiredInformationPlaceholder, jsonString).replace(createCommentPlaceholder, createCommentUrl);

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    await octokit.rest.issues.createComment({
        repo: github.context.repo.repo,
        owner: github.context.repo.owner,
        issue_number: github.context.issue.number,
        body: commentBody,
    });

}

addComment().then();