// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, OnInit } from '@angular/core';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreSites } from '@services/sites';
import { ContextLevel } from '@/core/constants';
import { Translate } from '@singletons';
import { CoreObject } from '@singletons/object';
import { CoreNavigator } from '@services/navigator';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreUrl } from '@singletons/url';
import { CoreSharedModule } from '@/core/shared.module';
import { ModFeature, ModArchetype } from '@addons/mod/constants';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';

/**
 * Component to render an "activity modules" block.
 */
@Component({
    selector: 'addon-block-activitymodules',
    templateUrl: 'addon-block-activitymodules.html',
    styleUrl: 'activitymodules.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class AddonBlockActivityModulesComponent extends CoreBlockBaseComponent implements OnInit {

    entries: AddonBlockActivityModuleEntry[] = [];

    protected fetchContentDefaultError = 'Error getting activity modules data.';

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    async invalidateContent(): Promise<void> {
        await CoreCourse.invalidateSections(this.instanceId);
    }

    /**
     * Fetch the data to render the block.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchContent(): Promise<void> {
        const sections = await CoreCourse.getSections(this.getCourseId(), false, true);

        this.entries = [];
        const archetypes: Record<string, number> = {};
        const modIcons: Record<string, string> = {};
        let modFullNames: Record<string, string> = {};
        const brandedIcons: Record<string, boolean|undefined> = {};

        const modules = CoreCourse.getSectionsModules(sections, {
            ignoreSection: section => !CoreCourseHelper.canUserViewSection(section),
            ignoreModule: module => !CoreCourseHelper.canUserViewModule(module) || !CoreCourseModuleHelper.moduleHasView(module),
        });

        modules.forEach((mod) => {
            if (archetypes[mod.modname] !== undefined) {
                return;
            }

            // Get the archetype of the module type.
            archetypes[mod.modname] = CoreCourseModuleDelegate.supportsFeature<number>(
                mod.modname,
                ModFeature.MOD_ARCHETYPE,
                ModArchetype.OTHER,
            );

            // Get the full name of the module type.
            if (archetypes[mod.modname] === ModArchetype.RESOURCE) {
                // All resources are gathered in a single "Resources" option.
                if (!modFullNames['resources']) {
                    modFullNames['resources'] = Translate.instant('core.resources');
                }
            } else {
                modFullNames[mod.modname] = mod.modplural;
            }

            brandedIcons[mod.modname] = mod.branded;

            // If this is not a theme image, leave it undefined to avoid having specific activity icons.
            if (CoreUrl.isThemeImageUrl(mod.modicon)) {
                modIcons[mod.modname] = mod.modicon;
            }
        });

        // Sort the modnames alphabetically.
        modFullNames = CoreObject.sortValues(modFullNames);
        for (const modName in modFullNames) {
            const iconModName = modName === 'resources' ? 'page' : modName;

            const icon = await CoreCourseModuleDelegate.getModuleIconSrc(iconModName, modIcons[iconModName]);

            this.entries.push({
                icon,
                iconModName,
                name: modFullNames[modName],
                modName,
                branded: brandedIcons[iconModName],
            });
        }
    }

    /**
     * Obtain the appropiate course id for the block.
     *
     * @returns Course id.
     */
    protected getCourseId(): number {
        if (this.contextLevel == ContextLevel.COURSE) {
            return this.instanceId;
        }

        return CoreSites.getCurrentSiteHomeId();
    }

    /**
     * Navigate to the activity list.
     *
     * @param entry Selected entry.
     */
    gotoCoureListModType(entry: AddonBlockActivityModuleEntry): void {
        CoreNavigator.navigateToSitePath('course/' + this.getCourseId() + '/list-mod-type', {
            params: {
                modName: entry.modName,
                title: entry.name,
            },
        });
    }

}

type AddonBlockActivityModuleEntry = {
    icon: string;
    name: string;
    modName: string;
    iconModName: string;
    branded?: boolean;
};
