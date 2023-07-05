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

import * as fs from "fs";
import {Util} from "./Util";
import * as core from "@actions/core";

async function triggerTest() {
    const payloadFile = `${process.env.TESTIO_SCRIPTS_DIR}/resources/testio_payload.json`;
    const errorFileName = `${process.env.TESTIO_ERROR_MSG_FILE}`;
    const testioProductId = `${process.env.TESTIO_PRODUCT_ID}`;
    const testioToken = `${process.env.TESTIO_TOKEN}`;

    const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));
    console.log("Payload:");
    console.log(payload);

    const endpoint = `https://api.test.io/customer/v2/products/${testioProductId}/exploratory_tests`;
    Util.request("POST", endpoint, testioToken, payload)
        .then((createdTest) => {
            console.log("Created test with id: " + createdTest.exploratory_test.id)
            core.setOutput("testio-created-test-id", createdTest.exploratory_test.id);
        })
        .catch((error) => {
            Util.throwErrorAndPrepareErrorMessage(error, errorFileName);
        });

}

triggerTest().then();