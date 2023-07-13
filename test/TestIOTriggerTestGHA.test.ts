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
import {jest} from '@jest/globals';

//jest.mock("@octokit/rest");
import {Octokit} from "@octokit/rest";

describe('Trigger TestIO Test GHA', () => {

    let githubToken: string;
    let owner: string;
    let repo: string;
    let pr: number;
    let actionRootDir: string;

    let gha: TestIOTriggerTestGHA;

    function initMocks() {
        jest.spyOn(Octokit.prototype.rest.issues, 'createComment').mockImplementation(jest.fn(() => {
            console.log("no real request via Octokit");
            return Promise.resolve();
        }) as jest.Mock);
    }

    beforeAll(() => {
        initMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        githubToken = "MOCK_TOKEN";
        owner = "Staffbase";
        repo = "testio-management";
        pr = 666;
        actionRootDir = ".";
        gha = TestIOTriggerTestGHA.create(githubToken, owner, repo, pr, actionRootDir);
        expect(gha).not.toBeNull();
        expect(gha).not.toBeUndefined();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should instantiate class correctly', () => {
        expect(gha.githubToken).toBe(githubToken);
        expect(gha.owner).toBe(owner);
        expect(gha.repo).toBe(repo);
        expect(gha.pr).toBe(pr);
        expect(gha.actionRootDir).toBe(actionRootDir);
    });

    it('should create comment', async () => {
        const createCommentUrl = "https://github.com/MyOrg/myrepo/issues/123456/comments#98765432";
        await expect(() => gha.addPrepareComment(createCommentUrl)).rejects.not.toThrowError();
    });
});
