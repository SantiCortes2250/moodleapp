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

import { OnInit, Input, Component, OnChanges, SimpleChanges } from '@angular/core';
import { CoreLogger } from '@singletons/logger';
import { CoreArray } from '@singletons/array';
import { CoreText } from '@singletons/text';
import { CoreCourseBlock } from '../../course/services/course';
import { Params } from '@angular/router';
import { ContextLevel } from '@/core/constants';
import { CoreNavigationOptions } from '@services/navigator';
import { AsyncDirective } from '@classes/async-directive';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';

/**
 * Template class to easily create components for blocks.
 */
@Component({
    template: '',
})
export abstract class CoreBlockBaseComponent implements OnInit, OnChanges, ICoreBlockComponent, AsyncDirective {

    @Input({ required: true }) title!: string; // The block title.
    @Input({ required: true }) block!: CoreCourseBlock; // The block to render.
    @Input({ required: true }) contextLevel!: ContextLevel; // The context where the block will be used.
    @Input({ required: true }) instanceId!: number; // The instance ID associated with the context level.
    @Input() link?: string; // Link to go when clicked.
    @Input() linkParams?: Params; // Link params to go when clicked.
    @Input() navOptions?: CoreNavigationOptions; // Navigation options.

    loaded = false; // If false, the UI should display a loading.
    protected fetchContentDefaultError = ''; // Default error to show when loading contents.
    protected onReadyPromise = new CorePromisedValue<void>();

    protected logger: CoreLogger;

    constructor() {
        const loggerName = this.constructor.name ?? 'AddonBlockComponent';

        this.logger = CoreLogger.getInstance(loggerName);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.loadContent();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: SimpleChanges): void {
        if (changes.block) {
            this.parseConfigs();
        }
    }

    /**
     * Parse configs if needed.
     */
    protected parseConfigs(): void {
        if (!this.block.configs?.length || this.block.configsRecord) {
            return;
        }

        this.block.configs.forEach((config) => {
            config.value = CoreText.parseJSON(config.value);
        });

        this.block.configsRecord = CoreArray.toObject(this.block.configs, 'name');
    }

    /**
     * Perform the refresh content function.
     *
     * @param showLoading Whether to show loading.
     * @returns Resolved when done.
     */
    protected async refreshContent(showLoading?: boolean): Promise<void> {
        if (showLoading) {
            this.loaded = false;
        }

        // Wrap the call in a try/catch so the workflow isn't interrupted if an error occurs.
        try {
            await this.invalidateContent();
        } catch (ex) {
            // An error ocurred in the function, log the error and just resolve the promise so the workflow continues.
            this.logger.error(ex);
        }

        await this.loadContent();
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(): Promise<void> {
        return;
    }

    /**
     * Loads the component contents and shows the corresponding error.
     */
    protected async loadContent(): Promise<void> {
        // Wrap the call in a try/catch so the workflow isn't interrupted if an error occurs.
        try {
            await this.fetchContent();
        } catch (error) {
            // An error ocurred in the function, log the error and just resolve the promise so the workflow continues.
            this.logger.error(error);

            // Error getting data, fail.
            CoreAlerts.showError(error, { default: Translate.instant(this.fetchContentDefaultError) });
        }

        this.loaded = true;
        this.onReadyPromise.resolve();
    }

    /**
     * Download the component contents.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchContent(): Promise<void> {
        return;
    }

    /**
     * Reload content without invalidating data.
     *
     * @returns Promise resolved when done.
     */
    async reloadContent(): Promise<void> {
        if (!this.loaded) {
            // Content being loaded, don't do anything.
            return;
        }

        this.loaded = false;
        await this.loadContent();
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return await this.onReadyPromise;
    }

}

/**
 * Interface for block components.
 */
export interface ICoreBlockComponent {

    /**
     * Perform the invalidate content function.
     */
    invalidateContent(): Promise<void>;

}
