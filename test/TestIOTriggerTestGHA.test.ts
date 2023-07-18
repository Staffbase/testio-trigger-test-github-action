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
    const submitCommentID = 9999999999999;
    const actionRootDir = "testResourcesTemp";
    const errorFileName = "errorToComment.msg";
    const testioProductId = "333666999";
    const testioToken = "MY_TESTIO_DUMMY_TOKEN";

    const setupWithMockedIssueCreation = (pathUnderRoot?: string) => {
        // create a MockAgent to intercept request made using undici
        const agent = new MockAgent({connections: 1});
        setGlobalDispatcher(agent);

        // https://docs.github.com/en/rest/issues/comments?apiVersion=2022-11-28#create-an-issue-comment
        agent
            .get("https://api.github.com")
            .intercept({
                path: `/repos/${owner}/${repo}/issues/${pr}/comments`,
                method: "POST"
            })
            .reply(201);

        return TestIOTriggerTestGHA.createForGithub(githubToken, owner, repo, pr, actionRootDir + (pathUnderRoot? pathUnderRoot : ''), errorFileName);
    };

    const setupWithMockedCommentRetrieval = (pathUnderRoot: string) => {
        // create a MockAgent to intercept request made using undici
        const agent = new MockAgent({connections: 1});
        setGlobalDispatcher(agent);

        const retrievedComment: string = fs.readFileSync("testResources/expected-prepare-comment.md", 'utf8');
        // https://docs.github.com/en/rest/issues/comments?apiVersion=2022-11-28#get-an-issue-comment
        agent
            .get("https://api.github.com")
            .intercept({
                path: `/repos/${owner}/${repo}/issues/comments/${submitCommentID}`,
                method: "GET"
            })
            .reply(200, {body: retrievedComment}, {headers: {'Content-Type': 'application/json'}});

        return TestIOTriggerTestGHA.createForGithub(githubToken, owner, repo, pr, actionRootDir + (pathUnderRoot? pathUnderRoot : ''), errorFileName);
    };

    const setupWithMockedPrTitleRetrieval = (expectedPrTitle: undefined | string) => {
        // create a MockAgent to intercept request made using undici
        const agent = new MockAgent({connections: 1});
        setGlobalDispatcher(agent);

        const retrievedComment: string = fs.readFileSync("testResources/expected-prepare-comment.md", 'utf8');
        // https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#get-a-pull-request
        agent
            .get("https://api.github.com")
            .intercept({
                path: `/repos/${owner}/${repo}/pulls/${pr}`,
                method: "GET"
            })
            .reply(200, {title: expectedPrTitle}, {headers: {'Content-Type': 'application/json'}});

        return TestIOTriggerTestGHA.createForGithub(githubToken, owner, repo, pr, actionRootDir, errorFileName);
    }

    // https://api.test.io/customer/v2/products/${this.testioProductId}/exploratory_tests
    const setupWithMockedTestIoAPI = (testioProductId: string, testioToken: string, expectedTestId: number) => {
        // create a MockAgent to intercept request made using undici
        const agent = new MockAgent({connections: 1});
        setGlobalDispatcher(agent);

        agent
            .get("https://api.test.io")
            .intercept({
                path: `/customer/v2/products/${testioProductId}/exploratory_tests`,
                method: "POST"
            })
            .reply(200, {exploratory_test: {id: expectedTestId}}, {headers: {'Content-Type': 'application/json'}});

        return TestIOTriggerTestGHA.createForTestIO(testioProductId, testioToken, actionRootDir, errorFileName);
    }


    it('should instantiate class correctly', () => {
        let gha = TestIOTriggerTestGHA.createForGithub(githubToken, owner, repo, pr, actionRootDir, errorFileName);
        expect(gha.githubToken).toBe(githubToken);
        expect(gha.owner).toBe(owner);
        expect(gha.repo).toBe(repo);
        expect(gha.pr).toBe(pr);
        expect(gha.actionRootDir).toBe(actionRootDir);
        expect(gha.errorFile).toBe(actionRootDir + "/resources/" + errorFileName);
        expect(gha.testioProductId).toBeUndefined();
        expect(gha.testioToken).toBeUndefined();

        gha = TestIOTriggerTestGHA.createForTestIO(testioProductId, testioToken, actionRootDir, errorFileName);
        expect(gha.githubToken).toBeUndefined();
        expect(gha.owner).toBeUndefined();
        expect(gha.repo).toBeUndefined();
        expect(gha.pr).toBeUndefined();
        expect(gha.actionRootDir).toBe(actionRootDir);
        expect(gha.errorFile).toBe(actionRootDir + "/resources/" + errorFileName);
        expect(gha.testioProductId).toBe(testioProductId);
        expect(gha.testioToken).toBe(testioToken);
    });

    it("should check wrong instantiation of GHA", async () => {
        // instantiate for TestIO but call a function specific to Github
        let gha = TestIOTriggerTestGHA.createForTestIO("dummy", "dummy", actionRootDir, errorFileName);
        await expect(gha.addPrepareComment("dummy", "dummy", "dummy")).rejects.toEqual(new Error("Github properties are not configured"));
        await expect(gha.retrieveCommentContent(-1, "dummy")).rejects.toEqual(new Error("Github properties are not configured"));
        await expect(gha.retrievePrTitle()).rejects.toEqual(new Error("Github properties are not configured"));
        await expect(gha.createAndPersistTestIoPayload({}, "dummy")).rejects.toEqual(new Error("Github properties are not configured"));

        // instantiate for Github but call a function specific to TestIO
        gha = TestIOTriggerTestGHA.createForGithub("dummy", "dummy", "dummy", -1, actionRootDir, errorFileName);
        await expect(gha.triggerTestIoTest()).rejects.toEqual(new Error("TestIO properties are not configured"));
    });

    it("should create comment", async () => {
        const gha = setupWithMockedIssueCreation("/..");
        const commentPrepareTemplateFile = "exploratory_test_comment_prepare_template.md";
        const commentPrepareJsonFile = "exploratory_test_comment_prepare.json";
        const createCommentUrl = `https://github.com/${owner}/${repo}/issues/${pr}/comments#987654321`;
        const createdComment = await gha.addPrepareComment(commentPrepareTemplateFile, commentPrepareJsonFile, createCommentUrl);

        const expectedComment = fs.readFileSync("testResources/expected-prepare-comment.md", 'utf8');
        expect(createdComment).toBe(expectedComment);
    });

    it("should retrieve content of a PR comment after editing", async () => {
        const gha = setupWithMockedCommentRetrieval("/..");
        const submitCommentUrl = `https://github.com/${owner}/${repo}/issues/${pr}/comments#${submitCommentID}`;
        const retrievedComment = await gha.retrieveCommentContent(submitCommentID, submitCommentUrl);

        const expectedComment = fs.readFileSync("testResources/expected-prepare-comment.md", 'utf8');
        expect(retrievedComment).toBe(expectedComment);
    });

    it("should retrieve prepare object from a retrieved comment of a PR after editing", async () => {
        const gha = setupWithMockedCommentRetrieval("/..");
        const submitCommentUrl = `https://github.com/${owner}/${repo}/issues/${pr}/comments#${submitCommentID}`;
        const retrievedComment = await gha.retrieveCommentContent(submitCommentID, submitCommentUrl);
        const prepareObject: any = gha.retrieveValidPrepareObjectFromComment(retrievedComment);

        expect(prepareObject.test_environment.url).toBe("your URL of preview deployment or built bundle from bot-the-builder");
        expect(prepareObject.test_environment.access).toBe("provide credentials for the tester to access the environment");
        expect(prepareObject.feature.title).toBe("The name of the feature to be tested");
        expect(prepareObject.feature.description).toBe("A short description of the feature to be tested");
        expect(prepareObject.feature.howtofind).toBe("Describe where to find the feature to be tested");
        expect(prepareObject.feature.user_stories[0]).toBe("Add 1 or more user stories here which you want the tester to verify");
        expect(prepareObject.additionalInstructions).toBe("(optional, remove it if not needed)");
    });

    it("should retrieve PR title", async () => {
        let expectedPrTitle: undefined | string = "test: this is my test PR title";
        let gha = setupWithMockedPrTitleRetrieval(expectedPrTitle);
        const prTitle: string = await gha.retrievePrTitle();
        expect(prTitle).toBe(expectedPrTitle);

        expectedPrTitle = undefined;
        gha = setupWithMockedPrTitleRetrieval(expectedPrTitle);
        await expect(gha.retrievePrTitle()).rejects.toEqual(new Error("Could not retrieve title of the PR"));
    });

    it("should create TestIO payload and persist it in a file", async () => {
        const retrievedComment: string = fs.readFileSync("testResources/expected-prepare-comment.md", 'utf8');
        let gha = TestIOTriggerTestGHA.createForGithub(githubToken, owner, repo, pr, actionRootDir + "/..", errorFileName);
        const prepareObject: any = gha.retrieveValidPrepareObjectFromComment(retrievedComment);
        const prTitle = "test: this is my test PR title";

        // we need to re-instantiate in order to change the action root dir
        gha.createAndPersistTestIoPayload(prepareObject, prTitle);

        const payloadFile = "testResourcesTemp/resources/testio_payload.json";
        const storedPayload = JSON.stringify(JSON.parse(fs.readFileSync(payloadFile, 'utf8')), null, 2);
        const expectedPayload = fs.readFileSync("testResources/expected-payload.json", 'utf8');
        expect(storedPayload).toBe(expectedPayload);
    });

    it("should trigger a test on TestIO", async () => {
        const min = 10000;
        const max = 15000;
        // random number between min-max
        const expectedTestId = Math.floor(Math.random() * (max - min + 1) + min)

        const gha = setupWithMockedTestIoAPI(testioProductId, testioToken, expectedTestId);
        const createdTest: any = await gha.triggerTestIoTest();
        expect(createdTest.exploratory_test.id).toBe(expectedTestId);
    });

});
