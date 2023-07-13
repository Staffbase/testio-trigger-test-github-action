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

import { TestIOTriggerTestGHA } from "../src/TestIOTriggerTestGHA";
import { jest } from "@jest/globals";

import { MockAgent, setGlobalDispatcher } from "undici";

describe("Trigger TestIO Test GHA", () => {
  const setup = () => {
    // create a MockAgent to intercept request made using undici
    const agent = new MockAgent({ connections: 1 });
    setGlobalDispatcher(agent);
    agent
      .get("https://api.github.com")
      .intercept({
        path: "/repos/Staffbase/testio-management/issues/666/comments",
        method: "POST",
      })
      .reply(201);

    return TestIOTriggerTestGHA.create(
      "MOCK_TOKEN",
      "Staffbase",
      "testio-management",
      666,
      "."
    );
  };

  it("should create comment", async () => {
    const gha = setup();
    const createCommentUrl =
      "https://github.com/MyOrg/myrepo/issues/123456/comments#98765432";

    await gha.addPrepareComment(createCommentUrl);
  });
});
