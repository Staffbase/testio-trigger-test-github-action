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

describe("TestIO Trigger-from-PR logic", () => {

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
        const parsedObject = Util.getJsonObjectFromComment( /```json\s(.+)\s```/sm, commentBody, 1);
        expect(parsedObject).not.toBeNull();
    });

    it('should validate parsed object against schema', () => {
        const prepareTestSchemaFile = "resources/exploratory_test_comment_prepare_schema.json";
        const parsedObject = Util.getJsonObjectFromComment( /```json\s(.+)\s```/sm, commentBody, 1);
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

    it('should convert prepare object into TestIO payload', () => {
        const prepareObject = Util.getJsonObjectFromComment( /```json\s(.+)\s```/sm, commentBody, 1);
        const repo = "testio-management";
        const owner = "Staffbase";
        const pr = 666;
        const commentID = 123456;
        const testioPayload = Util.convertPrepareObjectToTestIOPayload(prepareObject, repo, owner, pr);
        const testName = `${owner}/${repo}/${pr}`;
        expect(testioPayload.exploratory_test.test_title).toBe(testName);
        expect(testioPayload.exploratory_test.test_environment.title).toBe(testName + " test environment");
        expect(testioPayload.exploratory_test.test_environment.url).toBe(prepareObject.test_environment.url);
        expect(testioPayload.exploratory_test.test_environment.access).toBe(prepareObject.test_environment.access);
        expect(testioPayload.exploratory_test.features[0].title).toBe(prepareObject.feature.title);
        expect(testioPayload.exploratory_test.features[0].description).toBe(prepareObject.feature.description);
        expect(testioPayload.exploratory_test.features[0].howtofind).toBe(prepareObject.feature.howtofind);
        expect(testioPayload.exploratory_test.features[0].user_stories).toBe(prepareObject.feature.user_stories);
    });

});