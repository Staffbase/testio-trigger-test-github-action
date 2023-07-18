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

import {Util} from "../src/Util";
import fs from "fs";
import betterAjvErrors from 'better-ajv-errors';
import {MockAgent, setGlobalDispatcher} from "undici";

describe("TestIO Trigger-from-PR Util", () => {

    let commentBody: string;

    beforeEach(() => {
        const commentPrepareTemplateFile = "resources/exploratory_test_comment_prepare_template.md";
        const commentTemplate = fs.readFileSync(commentPrepareTemplateFile, 'utf8');

        const commentPrepareJsonFile = "resources/exploratory_test_comment_prepare.json";
        const jsonString = fs.readFileSync(commentPrepareJsonFile, 'utf8');

        const requiredInformationPlaceholder = "$$REQUIRED_INFORMATION_TEMPLATE$$";
        const createCommentPlaceholder = "$$CREATE_COMMENT_URL$$";
        const url = "https://github.com/MyOrg/myrepo/issues/123456/comments#98765432";
        commentBody = commentTemplate.replace(requiredInformationPlaceholder, jsonString).replace(createCommentPlaceholder, url);
    });

    it('should parse an object from the Github preparation comment', () => {
        const parsedObject = Util.retrievePrepareObjectFromComment(commentBody);
        expect(parsedObject).not.toBeNull();
    });

    it('should throw when Github preparation comment cannot be matched', () => {
        expect(() => Util.retrievePrepareObjectFromComment("non matching comment")).toThrowError("Provided comment didn't match");
    });

    it('should validate parsed object against schema', () => {
        const prepareTestSchemaFile = "resources/exploratory_test_comment_prepare_schema.json";
        const parsedObject = Util.retrievePrepareObjectFromComment(commentBody);
        const {valid, validation} = Util.validateObjectAgainstSchema(parsedObject, prepareTestSchemaFile);
        if (!valid) {
            if (validation.errors) {
                const output = betterAjvErrors(prepareTestSchemaFile, parsedObject, validation.errors);
                console.log(output);
                throw new Error(output);
            }
        }
        expect(valid).toBe(true);
    });

    it('should correctly extract the URL from comment', () => {
        console.log(commentBody);
        const url = Util.getUrlFromComment(commentBody);
        expect(url).toBe("https://github.com/MyOrg/myrepo/issues/123456/comments#98765432");
    });

    it('should not match any URL in comment', () => {
        expect(Util.getUrlFromComment("no URL in here")).toBeUndefined();
    });

    it('should convert prepare object into TestIO payload', () => {
        const prepareObject = Util.retrievePrepareObjectFromComment(commentBody);
        const repo = "testio-management";
        const owner = "Staffbase";
        const pr = 666;
        const prTitle = "My awesome feature";
        const testioPayload = Util.convertPrepareObjectToTestIOPayload(prepareObject, repo, owner, pr, prTitle);
        const testName = `[${owner}/${repo}/${pr}]${prTitle}`;
        expect(testioPayload.exploratory_test.test_title).toBe(testName);
        expect(testioPayload.exploratory_test.test_environment.title).toBe(testName + "[test environment]");
        expect(testioPayload.exploratory_test.test_environment.url).toBe(prepareObject.test_environment.url);
        expect(testioPayload.exploratory_test.test_environment.access).toBe(prepareObject.test_environment.access);
        expect(testioPayload.exploratory_test.features[0].title).toBe(prepareObject.feature.title);
        expect(testioPayload.exploratory_test.features[0].description).toBe(prepareObject.feature.description);
        expect(testioPayload.exploratory_test.features[0].howtofind).toBe(prepareObject.feature.howtofind);
        expect(testioPayload.exploratory_test.features[0].user_stories).toBe(prepareObject.feature.user_stories);
        expect(testioPayload.exploratory_test.instructions).toBe(prepareObject.additionalInstructions);
    });

    it('should convert prepare object into TestIO payload without additional instructions', () => {
        const prepareObject = Util.retrievePrepareObjectFromComment(commentBody);
        delete prepareObject.additionalInstructions;
        const repo = "testio-management";
        const owner = "Staffbase";
        const pr = 666;
        const prTitle = "My awesome feature";
        const testioPayload = Util.convertPrepareObjectToTestIOPayload(prepareObject, repo, owner, pr, prTitle);
        const testName = `[${owner}/${repo}/${pr}]${prTitle}`;
        expect(testioPayload.exploratory_test.test_title).toBe(testName);
        expect(testioPayload.exploratory_test.test_environment.title).toBe(testName + "[test environment]");
        expect(testioPayload.exploratory_test.test_environment.url).toBe(prepareObject.test_environment.url);
        expect(testioPayload.exploratory_test.test_environment.access).toBe(prepareObject.test_environment.access);
        expect(testioPayload.exploratory_test.features[0].title).toBe(prepareObject.feature.title);
        expect(testioPayload.exploratory_test.features[0].description).toBe(prepareObject.feature.description);
        expect(testioPayload.exploratory_test.features[0].howtofind).toBe(prepareObject.feature.howtofind);
        expect(testioPayload.exploratory_test.features[0].user_stories).toBe(prepareObject.feature.user_stories);
        expect(testioPayload.exploratory_test.instructions).toBeNull();
    });

    it('should truncate looooooong PR titles and add suffix', () => {
        const maxLength= 80;
        let prTitle = "This is my short title";
        let truncatedString = Util.truncateString(prTitle, maxLength, "...", false);
        expect(truncatedString).toBe(prTitle);

        prTitle = "This is my veryyyyyyyy loooooooooooooooooooooooooooooooooooooooooooooooooong PR title";
        truncatedString = Util.truncateString(prTitle, maxLength, "...", false);
        expect(truncatedString).toBe("This is my veryyyyyyyy loooooooooooooooooooooooooooooooooooooooooooooooooong ...");

        prTitle = "This is my veryyyyyyyy loooooooooooooooooooooooooooooooooooooooooooooooooooooooong PR title";
        truncatedString = Util.truncateString(prTitle, maxLength, "[test environment]", true);
        expect(truncatedString).toBe("This is my veryyyyyyyy loooooooooooooooooooooooooooooooooooooo[test environment]");
    });

    // digging into failing action run https://github.com/Staffbase/testio-management/actions/runs/5527851778/jobs/10084029267
    it('should parse a failing prepare comment', () => {
        const failingCommentFile = "testResources/testio-management-pull-65-issuecomment-1630429841.md";
        const failingComment = fs.readFileSync(failingCommentFile, 'utf8');

        expect(() => Util.retrievePrepareObjectFromComment(failingComment)).not.toThrowError();
        const prepareObject: any = Util.retrievePrepareObjectFromComment(failingComment);
        expect(prepareObject).not.toBeUndefined();
    });

    // https://api.test.io/customer/v2/products/${this.testioProductId}/exploratory_tests
    const setupWithMockedTestIoAPI = (testioProductId: string) => {
        // create a MockAgent to intercept request made using undici
        const agent = new MockAgent({connections: 1});
        setGlobalDispatcher(agent);

        agent
            .get("https://api.test.io")
            .intercept({
                path: `/customer/v2/products/${testioProductId}/exploratory_tests`,
                method: "POST"
            })
            .reply(404, {error: "dummy error"}, {headers: {'Content-Type': 'application/json'}});

        agent
            .get("https://api.test.io")
            .intercept({
                path: `/customer/v2/products/${testioProductId}/exploratory_tests`,
                method: "GET"
            })
            .reply(200, {foo: "bar"}, {headers: {'Content-Type': 'application/json'}});
    }

    it("should cover request(..)", async () => {
        const testioProductId = "333666failingProduct";
        const testioToken = "MY_TESTIO_MOCK_TOCKEN";
        setupWithMockedTestIoAPI(testioProductId);

        const endpoint = `https://api.test.io/customer/v2/products/${testioProductId}/exploratory_tests`;
        await expect(() => Util.request("POST", endpoint, testioToken)).rejects.toThrowError();
        const fooBar = await Util.request("GET", endpoint, testioToken);
        expect(fooBar).toStrictEqual({foo: "bar"});
    });

    it('should handle error messages', () => {
        const errorFile = "temp/tempError.msg";
        const errorMessage = "my error";
        expect(() => Util.prepareErrorMessageAndOptionallyThrow(errorMessage, errorFile)).toThrowError(errorMessage);
        expect(fs.existsSync(errorFile)).toBe(true);
        expect(fs.readFileSync(errorFile, 'utf8')).toBe(errorMessage);

        expect(Util.prepareErrorMessageAndOptionallyThrow(errorMessage, errorFile, true)).toStrictEqual(Error(errorMessage));
    });
});