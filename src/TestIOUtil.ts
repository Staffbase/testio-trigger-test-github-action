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

    private static readonly ENDPOINT_LIST_CATEGORIES = "https://devices.test.io/api/categories";
    private static readonly ENDPOINT_LIST_OPERATING_SYSTEMS = (deviceCategoryId: number) => `https://devices.test.io/api/operating_systems?filter[category]=${deviceCategoryId}`;
    private static readonly ENDPOINT_LIST_OPERATING_SYSTEM_VERSIONS = (osId: number, offset: number) => `http://devices.test.io/api/operating_system_versions?filter[operating_system]=${osId}&offset=${offset}`;

    private static readonly DEFAULT_MOBILE_CATEGORY_NAME = "smartphone";

    static async retrieveDeviceCategoryIdByName(categoryName: string): Promise<number> {
        const result = await Util.request("GET", this.ENDPOINT_LIST_CATEGORIES);
        const categories: any[] = result.categories;
        const expectedCategoryLower = categoryName.toLowerCase();
        const categoryFound = categories.find((category) => category.key.toLowerCase() === expectedCategoryLower || category.name.toLowerCase() === expectedCategoryLower);
        if (categoryFound) {
            return categoryFound.id;
        }
        return -1;
    }

    static async retrieveDefaultMobileDeviceCategory(): Promise<number> {
        return this.retrieveDeviceCategoryIdByName(this.DEFAULT_MOBILE_CATEGORY_NAME);
    }

    static async retrieveOperatingSystemIdByDeviceCategoryIdAndName(deviceCategoryId: number, osName: string): Promise<number> {
        const result = await Util.request("GET", this.ENDPOINT_LIST_OPERATING_SYSTEMS(deviceCategoryId));
        const operatingSystems: any[] = result.operating_systems;
        const expectedOsNameLower = osName.toLowerCase();
        const osFound = operatingSystems.find((os) => os.key.toLowerCase() === expectedOsNameLower || os.name.toLowerCase() === expectedOsNameLower);
        if (osFound) {
            return osFound.id;
        }
        return -1;
    }

    static async retrieveOsVersionIdByOsIdAndVersion(osId: number, version: string): Promise<number> {
        const startingOffset = 0;
        return this.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersionAndOffset(osId, version, startingOffset);
    }

    private static async retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersionAndOffset(osId: number, expectedVersion: string, offset: number): Promise<number> {
        const result = await Util.request("GET", this.ENDPOINT_LIST_OPERATING_SYSTEM_VERSIONS(osId, offset));
        const totalVersions = result.pagination.total;
        const limit = result.pagination.limit;
        const currentOffset = result.pagination.offset;
        const nextOffset = currentOffset + limit;

        const osVersions: any[] = result.operating_system_versions;
        const osVersionFound = osVersions.find((osVersion) => osVersion.name.toLowerCase() === expectedVersion.toLowerCase());
        if (osVersionFound) {
            return osVersionFound.id;
        } else if (nextOffset < totalVersions) {
            return this.retrieveOsVersionIdByDeviceCategoryIdAndOsNameAndVersionAndOffset(osId, expectedVersion, nextOffset);
        }
        return -1;
    }

    static async getDevicePayloadFromPrepareObjectDeviceSpec(device: { category: string; os: string; min: string; max?: string; } ): Promise<any> {
        const categoryId = await TestIOUtil.retrieveDeviceCategoryIdByName(device.category);
        if (categoryId == -1) {
            throw new Error(`Category '${device.category}' is not valid`);
        }

        const osId = await TestIOUtil.retrieveOperatingSystemIdByDeviceCategoryIdAndName(categoryId, device.os);
        if (osId == -1) {
            throw new Error(`OS name '${device.os}' is not valid`);
        }

        const minVersionId = await TestIOUtil.retrieveOsVersionIdByOsIdAndVersion(osId, device.min);
        if (minVersionId == -1) {
            throw new Error(`Min version '${device.min}' is not valid`);
        }

        const maxVersionId = (device.max ? await TestIOUtil.retrieveOsVersionIdByOsIdAndVersion(osId, device.max) : null);
        if (maxVersionId == -1) {
            throw new Error(`Max version '${device.max}' is not valid`);
        }

        return {
            requirements: [
                {
                    category: {
                        id: categoryId,
                        name: device.category
                    },
                    operating_system: {
                        id: osId,
                        name: device.os
                    },
                    min_operating_system_version: {
                        id: minVersionId,
                        name: device.min
                    },
                    max_operating_system_version: (maxVersionId ? {
                        id: maxVersionId,
                        name: device.max
                    } : null)
                }
            ]
        }
    }


    public static async convertPrepareObjectToTestIOPayload(prepareObject: any, repo: string, owner: string, pr: number, prTitle: string): Promise<any> {
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

        if (prepareObject.device) {
            const requirements = await TestIOUtil.getDevicePayloadFromPrepareObjectDeviceSpec(prepareObject.device);
            testioPayload.exploratory_test = {
                ...testioPayload.exploratory_test,
                ...requirements
            }
        }

        return testioPayload;
    }

}