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

import {Util} from "./Util";

export class TestIOUtil {

    private static readonly ENDPOINT_LIST_CATEGORIES = "http://devices.test.io/api/categories";

    static async retrieveDeviceCategoryIdByName(categoryName: string): Promise<number> {
        const result = await Util.request("GET", this.ENDPOINT_LIST_CATEGORIES);
        const categories: any[] = result.categories
        const expectedCategoryLower = categoryName.toLowerCase();
        const categoryFound = categories.find((category) => category.key.toLowerCase() === expectedCategoryLower || category.name.toLowerCase() === expectedCategoryLower);
        if (categoryFound) {
            return categoryFound.id;
        }
        return -1;
    }
}