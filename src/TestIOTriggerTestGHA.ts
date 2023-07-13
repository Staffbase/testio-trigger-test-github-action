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

export class TestIOTriggerTestGHA {

    private readonly _githubToken: string;
    private readonly _owner: string;
    private readonly _repo: string;
    private readonly _pr: number;
    private readonly _actionRootDir: string;

    // instantiation via constructor only allowed from within this class
    private constructor(githubToken: string, owner: string, repo: string, pr: number, actionRootDir: string) {
        this._githubToken = githubToken;
        this._repo = repo;
        this._pr = pr;
        this._actionRootDir = actionRootDir;
        this._owner = owner;
    }

    static create(githubToken: string, owner: string, repo: string, pr: number, actionRootDir: string) {
        return new TestIOTriggerTestGHA(githubToken, owner, repo, pr, actionRootDir);
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

    public async addPrepareComment(createCommentUrl: string) {
        const commentPrepareTemplateFile = `${this._actionRootDir}/resources/exploratory_test_comment_prepare_template.md`;
        const commentTemplate = fs.readFileSync(commentPrepareTemplateFile, 'utf8');

        const commentPrepareJsonFile = `${this._actionRootDir}/resources/exploratory_test_comment_prepare.json`;
        const jsonString = fs.readFileSync(commentPrepareJsonFile, 'utf8');

        const requiredInformationPlaceholder = "$$REQUIRED_INFORMATION_TEMPLATE$$";
        const createCommentPlaceholder = "$$CREATE_COMMENT_URL$$";
        const commentBody = commentTemplate.replace(requiredInformationPlaceholder, jsonString).replace(createCommentPlaceholder, createCommentUrl);

        const octokit = new Octokit({
            auth: this._githubToken
        });

        const response = await octokit.rest.issues.createComment({
            repo: this._repo,
            owner: this._owner,
            issue_number: this._pr,
            body: commentBody,
        });
        console.log(JSON.stringify(response));
        // if (!response.ok) {
        //     return Promise.reject("Couldn't create a comment");
        // }
    }
}