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

import {TestIOUtil} from "../src/TestIOUtil";

describe("TestIO Device API Util", () => {

    it('should return category id for name', async () => {
        let categoryName = "non-existent";
        let categoryId = await TestIOUtil.retrieveCategoryIdByName(categoryName);
        expect(categoryId).toBe(-1);

        categoryName = "SmArtpHone";
        categoryId = await TestIOUtil.retrieveCategoryIdByName(categoryName);
        expect(categoryId).toBe(2);
        categoryName = "SmArtphoneS";
        categoryId = await TestIOUtil.retrieveCategoryIdByName(categoryName);
        expect(categoryId).toBe(2);

        categoryName = "tAbLeT";
        categoryId = await TestIOUtil.retrieveCategoryIdByName(categoryName);
        expect(categoryId).toBe(6);
        categoryName = "tablets";
        categoryId = await TestIOUtil.retrieveCategoryIdByName(categoryName);
        expect(categoryId).toBe(6);
    });

});