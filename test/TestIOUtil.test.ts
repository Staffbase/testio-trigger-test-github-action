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

    it('should return device category id for name', async () => {
        let categoryName = "non-existent";
        let categoryId = await TestIOUtil.retrieveDeviceCategoryIdByName(categoryName);
        expect(categoryId).toBe(-1);

        categoryName = "SmArtpHone";
        categoryId = await TestIOUtil.retrieveDeviceCategoryIdByName(categoryName);
        expect(categoryId).toBe(2);
        categoryName = "SmArtphoneS";
        categoryId = await TestIOUtil.retrieveDeviceCategoryIdByName(categoryName);
        expect(categoryId).toBe(2);

        categoryName = "tAbLeT";
        categoryId = await TestIOUtil.retrieveDeviceCategoryIdByName(categoryName);
        expect(categoryId).toBe(6);
        categoryName = "tablets";
        categoryId = await TestIOUtil.retrieveDeviceCategoryIdByName(categoryName);
        expect(categoryId).toBe(6);

        // default is smartphone
        categoryId = await TestIOUtil.retrieveDefaultMobileDeviceCategory();
        expect(categoryId).toBe(2);
    });

    it('should return OS id for device category id and OS name', async () => {
        let deviceCategoryId = -1;
        let osName = "unknown OS";
        let osId = await TestIOUtil.retrieveOperatingSystemIdByDeviceCategoryIdAndName(deviceCategoryId, osName);
        expect(osId).toBe(-1);

        deviceCategoryId = 2;
        osName = "unknown OS";
        osId = await TestIOUtil.retrieveOperatingSystemIdByDeviceCategoryIdAndName(deviceCategoryId, osName);
        expect(osId).toBe(-1);

        deviceCategoryId = 2;
        osName = "Android";
        osId = await TestIOUtil.retrieveOperatingSystemIdByDeviceCategoryIdAndName(deviceCategoryId, osName);
        expect(osId).toBe(1);
        deviceCategoryId = 2;
        osName = "AnDRoid";
        osId = await TestIOUtil.retrieveOperatingSystemIdByDeviceCategoryIdAndName(deviceCategoryId, osName);
        expect(osId).toBe(1);

        deviceCategoryId = 2;
        osName = "iOs";
        osId = await TestIOUtil.retrieveOperatingSystemIdByDeviceCategoryIdAndName(deviceCategoryId, osName);
        expect(osId).toBe(2);

        deviceCategoryId = 2;
        osName = "windows-MoBiLe";
        osId = await TestIOUtil.retrieveOperatingSystemIdByDeviceCategoryIdAndName(deviceCategoryId, osName);
        expect(osId).toBe(9);
        deviceCategoryId = 2;
        osName = "windows mobile";
        osId = await TestIOUtil.retrieveOperatingSystemIdByDeviceCategoryIdAndName(deviceCategoryId, osName);
        expect(osId).toBe(9);
    });

    it('should return OS version id for device category id, OS name and version string', async () => {
        let osId = -1;
        let version = "no.valid.version";
        let osVersionId = await TestIOUtil.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersion(osId, version);
        expect(osVersionId).toBe(-1);

        // Android
        osId = 1;
        version = "no.valid.version";
        osVersionId = await TestIOUtil.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersion(osId, version);
        expect(osVersionId).toBe(-1);
        version = "3.0";
        osVersionId = await TestIOUtil.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersion(osId, version);
        expect(osVersionId).toBe(-1);
        // result on the first page of this endpoint
        version = "4.0.1";
        osVersionId = await TestIOUtil.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersion(osId, version);
        expect(osVersionId).toBe(22);
        // result on the second page of this endpoint
        version = "8.1 (go edition)";
        osVersionId = await TestIOUtil.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersion(osId, version);
        expect(osVersionId).toBe(314);

        // iOS
        osId = 2;
        // result on the first page of this endpoint
        version = "7.0.2";
        osVersionId = await TestIOUtil.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersion(osId, version);
        expect(osVersionId).toBe(76);
        // result on the second page of this endpoint
        version = "8.0.2";
        osVersionId = await TestIOUtil.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersion(osId, version);
        expect(osVersionId).toBe(144);
        // result on the last page of this endpoint
        version = "17.0.1";
        osVersionId = await TestIOUtil.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersion(osId, version);
        expect(osVersionId).toBe(809);
    });

});