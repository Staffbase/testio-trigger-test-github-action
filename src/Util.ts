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
import Ajv, {ValidateFunction} from "ajv";
import path from "path";

export class Util {

    private static getJsonObjectFromComment(regex: RegExp, comment: string, expectedIndexOfObject: number): any {
        const matches = regex.exec(comment);
        if (!matches) {
            throw new Error("Provided comment didn't match");
        }
        const jsonContents = matches[expectedIndexOfObject];
        if (!jsonContents) throw new Error("Provided input seems to be empty between ```json and ```");
        const cleanedJson = jsonContents.replace(/[\u0009]/g, " ");
        const parsedObject = JSON.parse(cleanedJson);
        return parsedObject;
    }

    public static validateObjectAgainstSchema(parsedObject: any, schemaFile: string): { valid: boolean; validation: ValidateFunction<unknown> } {
        const prepareTestSchema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
        const ajv = new Ajv({
            strictTuples: false
        });
        const validation = ajv.compile(prepareTestSchema);
        const valid = validation(parsedObject);
        return {valid, validation};
    }

    public static convertPrepareObjectToTestIOPayload(prepareObject: any, repo: string, owner: string, pr: number, prTitle: string): any {
        const titleBase = `[${owner}/${repo}/${pr}]${prTitle}`;
        const testioPayload = {
            exploratory_test: {
                test_title: titleBase,
                test_environment: {
                    // 80 is restriction from TestIO
                    title: Util.truncateString(titleBase, 80, "[test environment]", true),
                    url: prepareObject.test_environment.url,
                    access: prepareObject.test_environment.access,
                },
                features: [
                    {
                        id: 0,
                        title: prepareObject.feature.title,
                        description: prepareObject.feature.description,
                        howtofind: prepareObject.feature.howtofind,
                        user_stories: prepareObject.feature.user_stories
                    }
                ],
                instructions: (prepareObject.additionalInstructions ? prepareObject.additionalInstructions : null),
                duration: "2",
                testing_type: "rapid"
            }
        };
        return testioPayload;
    }

    public static async request(requestMethod: string, endpoint: string, authToken: string, bodyObject?: any): Promise<any> {
        const authTokenString = `Token ${authToken}`;
        let request = {
            method: requestMethod,
            headers: {
                'Authorization': `${authTokenString}`
            }
        };
        if (bodyObject) {
            request.headers = {
                ...request.headers, ...{
                    'Content-Type': 'application/json',
                }
            };
            request = {
                ...request, ...{
                    body: JSON.stringify(bodyObject)
                }
            };
        }
        const response = await fetch(endpoint, request);
        if (response.ok) {
            const result = await response.json();
            if (result) {
                console.log("Successfully received response from request");
                return result;
            }
            return Promise.reject("Deserializing the data from the response wasn't successful");
        } else {
            const error = new Error((await response.json()).error);
            return Promise.reject(error)
        }
    }

    public static prepareErrorMessageAndOptionallyThrow(errorMessage: string, errorMessageFilePath: string, dontThrow: boolean = false) {
        const errorMessageDir = path.parse(errorMessageFilePath).dir;
        if (!fs.existsSync(errorMessageDir)) {
            fs.mkdirSync(errorMessageDir, {recursive: true});
            console.log("Create path: " + errorMessageDir);
        }

        fs.writeFileSync(errorMessageFilePath, errorMessage);
        console.error(errorMessage);
        const error = new Error(errorMessage);
        if (dontThrow) {
            return error;
        }
        throw error;
    }

    static getUrlFromComment(comment: string): string | undefined {
        const urlRegex = /.*```json\s.*\s```\s.*\[.+]\(([^\)]+)\)*/sm;
        const matches = urlRegex.exec(comment);
        if (!matches) {
            console.log("Couldn't find a URL in the comment");
            return undefined;
        }
        return matches[1];
    }

    public static truncateString(string: string, maxLength: number, suffix: string, forceAddSuffix: boolean) {
        if (string.length <= maxLength && !forceAddSuffix) {
            return string;
        }

        return string.slice(0, maxLength - suffix.length) + suffix;
    }

    public static retrievePrepareObjectFromComment(comment: string): any | undefined {
        const jsonRegex = /.*```json\s(.+)\s```.*/sm;       // everything between ```json and ``` so that we can parse it
        let preparation: any;
        preparation = Util.getJsonObjectFromComment(jsonRegex, comment, 1);
        return preparation;
    }
}