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

import {TestIOTriggerTestGHA} from "../src/TestIOTriggerTestGHA";

import {MockAgent, setGlobalDispatcher} from "undici";
import fs from "fs";

describe("Trigger TestIO Test GHA", () => {

    const githubToken = "MOCK_TOKEN";
    const owner = "Me";
    const repo = "awesomeRepo";
    const pr = 666;
    const actionRootDir = ".";

    const setupWithMockedFetch = () => {
        // create a MockAgent to intercept request made using undici
        const agent = new MockAgent({connections: 1});
        setGlobalDispatcher(agent);

        agent
            .get("https://api.github.com")
            .intercept({
                path: `/repos/${owner}/${repo}/issues/${pr}/comments`,
                method: "POST"
            })
            .reply(201);

        return TestIOTriggerTestGHA.create(githubToken, owner, repo, pr, actionRootDir);
    };

    it('should instantiate class correctly', () => {
        const gha = TestIOTriggerTestGHA.create(githubToken, owner, repo, pr, actionRootDir);
        expect(gha.githubToken).toBe(githubToken);
        expect(gha.owner).toBe(owner);
        expect(gha.repo).toBe(repo);
        expect(gha.pr).toBe(pr);
        expect(gha.actionRootDir).toBe(actionRootDir);
    });

    it("should create comment", async () => {
        const gha = setupWithMockedFetch();
        const commentPrepareTemplateFile = "exploratory_test_comment_prepare_template.md";
        const commentPrepareJsonFile = "exploratory_test_comment_prepare.json";
        const createCommentUrl = `https://github.com/${owner}/${repo}/issues/${pr}/comments#987654321`;
        const createdComment = await gha.addPrepareComment(commentPrepareTemplateFile, commentPrepareJsonFile, createCommentUrl);

        const expectedComment = fs.readFileSync("testResources/expected-prepare-comment.md", 'utf8');
        expect(createdComment).toBe(expectedComment);
    });
});
