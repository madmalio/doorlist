export namespace main {
	
	export class DoorEntry {
	    id: string;
	    name: string;
	    qty: number;
	    opWidth: number;
	    opHeight: number;
	    styleId: string;
	    overlayType: string;
	    drawerFrontPosition: string;
	    overlaySubcategoryId: string;
	    customOverlay: number;
	    doorType: string;
	    buttGap: number;
	    useCustomOverlay: boolean;
	    overlayLeft: number;
	    overlayRight: number;
	    overlayTop: number;
	    overlayBottom: number;
	    panelLayout: string;
	    slabGrain: string;
	
	    static createFrom(source: any = {}) {
	        return new DoorEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.qty = source["qty"];
	        this.opWidth = source["opWidth"];
	        this.opHeight = source["opHeight"];
	        this.styleId = source["styleId"];
	        this.overlayType = source["overlayType"];
	        this.drawerFrontPosition = source["drawerFrontPosition"];
	        this.overlaySubcategoryId = source["overlaySubcategoryId"];
	        this.customOverlay = source["customOverlay"];
	        this.doorType = source["doorType"];
	        this.buttGap = source["buttGap"];
	        this.useCustomOverlay = source["useCustomOverlay"];
	        this.overlayLeft = source["overlayLeft"];
	        this.overlayRight = source["overlayRight"];
	        this.overlayTop = source["overlayTop"];
	        this.overlayBottom = source["overlayBottom"];
	        this.panelLayout = source["panelLayout"];
	        this.slabGrain = source["slabGrain"];
	    }
	}
	export class Job {
	    id: string;
	    customerName: string;
	    name: string;
	    woodChoice?: string;
	    productionStatus: string;
	    archived?: boolean;
	    defaultStyleId: string;
	    defaultOverlayCategoryId: string;
	    doorType: string;
	    buttGap: number;
	    useCustomOverlay: boolean;
	    overlayLeft: number;
	    overlayRight: number;
	    overlayTop: number;
	    overlayBottom: number;
	    defaultOverlay: number;
	    // Go type: time
	    createdDate: any;
	    doors: DoorEntry[];
	
	    static createFrom(source: any = {}) {
	        return new Job(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.customerName = source["customerName"];
	        this.name = source["name"];
	        this.woodChoice = source["woodChoice"];
	        this.productionStatus = source["productionStatus"];
	        this.archived = source["archived"];
	        this.defaultStyleId = source["defaultStyleId"];
	        this.defaultOverlayCategoryId = source["defaultOverlayCategoryId"];
	        this.doorType = source["doorType"];
	        this.buttGap = source["buttGap"];
	        this.useCustomOverlay = source["useCustomOverlay"];
	        this.overlayLeft = source["overlayLeft"];
	        this.overlayRight = source["overlayRight"];
	        this.overlayTop = source["overlayTop"];
	        this.overlayBottom = source["overlayBottom"];
	        this.defaultOverlay = source["defaultOverlay"];
	        this.createdDate = this.convertValues(source["createdDate"], null);
	        this.doors = this.convertValues(source["doors"], DoorEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DoorStyle {
	    id: string;
	    name: string;
	    family?: string;
	    variant?: string;
	    styleUse?: string;
	    isSlab: boolean;
	    order?: number;
	    stileWidth: number;
	    railWidth: number;
	    tenonLength: number;
	    panelThickness: number;
	    panelGap: number;
	
	    static createFrom(source: any = {}) {
	        return new DoorStyle(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.family = source["family"];
	        this.variant = source["variant"];
	        this.styleUse = source["styleUse"];
	        this.isSlab = source["isSlab"];
	        this.order = source["order"];
	        this.stileWidth = source["stileWidth"];
	        this.railWidth = source["railWidth"];
	        this.tenonLength = source["tenonLength"];
	        this.panelThickness = source["panelThickness"];
	        this.panelGap = source["panelGap"];
	    }
	}
	export class OverlayPreset {
	    id: string;
	    name: string;
	    left: number;
	    right: number;
	    top: number;
	    bottom: number;
	
	    static createFrom(source: any = {}) {
	        return new OverlayPreset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.left = source["left"];
	        this.right = source["right"];
	        this.top = source["top"];
	        this.bottom = source["bottom"];
	    }
	}
	export class OverlaySubcategory {
	    id: string;
	    name: string;
	    left: number;
	    right: number;
	    top: number;
	    bottom: number;
	
	    static createFrom(source: any = {}) {
	        return new OverlaySubcategory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.left = source["left"];
	        this.right = source["right"];
	        this.top = source["top"];
	        this.bottom = source["bottom"];
	    }
	}
	export class OverlayValues {
	    left: number;
	    right: number;
	    top: number;
	    bottom: number;
	
	    static createFrom(source: any = {}) {
	        return new OverlayValues(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.left = source["left"];
	        this.right = source["right"];
	        this.top = source["top"];
	        this.bottom = source["bottom"];
	    }
	}
	export class OverlayCategory {
	    id: string;
	    name: string;
	    default?: OverlayValues;
	    items?: OverlaySubcategory[];
	    doorItems?: OverlaySubcategory[];
	    drawerFrontItems?: OverlaySubcategory[];
	
	    static createFrom(source: any = {}) {
	        return new OverlayCategory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.default = this.convertValues(source["default"], OverlayValues);
	        this.items = this.convertValues(source["items"], OverlaySubcategory);
	        this.doorItems = this.convertValues(source["doorItems"], OverlaySubcategory);
	        this.drawerFrontItems = this.convertValues(source["drawerFrontItems"], OverlaySubcategory);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AppSettings {
	    theme: string;
	    measurementSystem?: string;
	    measurementConfirmed?: boolean;
	    onboardingDismissed?: boolean;
	    overlayCategories: OverlayCategory[];
	    woodPresets?: string[];
	    overlayPresets?: OverlayPreset[];
	    seededDefaultSlab?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.measurementSystem = source["measurementSystem"];
	        this.measurementConfirmed = source["measurementConfirmed"];
	        this.onboardingDismissed = source["onboardingDismissed"];
	        this.overlayCategories = this.convertValues(source["overlayCategories"], OverlayCategory);
	        this.woodPresets = source["woodPresets"];
	        this.overlayPresets = this.convertValues(source["overlayPresets"], OverlayPreset);
	        this.seededDefaultSlab = source["seededDefaultSlab"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AppBackupPayload {
	    version: number;
	    exportedAt?: string;
	    settings: AppSettings;
	    styles: DoorStyle[];
	    jobs: Job[];
	
	    static createFrom(source: any = {}) {
	        return new AppBackupPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.exportedAt = source["exportedAt"];
	        this.settings = this.convertValues(source["settings"], AppSettings);
	        this.styles = this.convertValues(source["styles"], DoorStyle);
	        this.jobs = this.convertValues(source["jobs"], Job);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class CatalogDataPayload {
	    version: number;
	    exportedAt?: string;
	    styles: DoorStyle[];
	
	    static createFrom(source: any = {}) {
	        return new CatalogDataPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.exportedAt = source["exportedAt"];
	        this.styles = this.convertValues(source["styles"], DoorStyle);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CreateJobRequest {
	    customerName: string;
	    project: string;
	    woodChoice?: string;
	    productionStatus: string;
	    defaultStyleId: string;
	    defaultOverlayCategoryId: string;
	    doorType: string;
	    buttGap: number;
	    useCustomOverlay: boolean;
	    overlayLeft: number;
	    overlayRight: number;
	    overlayTop: number;
	    overlayBottom: number;
	    defaultOverlay: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateJobRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customerName = source["customerName"];
	        this.project = source["project"];
	        this.woodChoice = source["woodChoice"];
	        this.productionStatus = source["productionStatus"];
	        this.defaultStyleId = source["defaultStyleId"];
	        this.defaultOverlayCategoryId = source["defaultOverlayCategoryId"];
	        this.doorType = source["doorType"];
	        this.buttGap = source["buttGap"];
	        this.useCustomOverlay = source["useCustomOverlay"];
	        this.overlayLeft = source["overlayLeft"];
	        this.overlayRight = source["overlayRight"];
	        this.overlayTop = source["overlayTop"];
	        this.overlayBottom = source["overlayBottom"];
	        this.defaultOverlay = source["defaultOverlay"];
	    }
	}
	export class CutListItem {
	    part: string;
	    qty: number;
	    length: number;
	    width: number;
	    thickness: number;
	    lengthFormatted: string;
	    widthFormatted: string;
	    thicknessFormatted: string;
	    label: string;
	    slabUse?: string;
	    slabGrain?: string;
	    drawerFrontPosition?: string;
	
	    static createFrom(source: any = {}) {
	        return new CutListItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.part = source["part"];
	        this.qty = source["qty"];
	        this.length = source["length"];
	        this.width = source["width"];
	        this.thickness = source["thickness"];
	        this.lengthFormatted = source["lengthFormatted"];
	        this.widthFormatted = source["widthFormatted"];
	        this.thicknessFormatted = source["thicknessFormatted"];
	        this.label = source["label"];
	        this.slabUse = source["slabUse"];
	        this.slabGrain = source["slabGrain"];
	        this.drawerFrontPosition = source["drawerFrontPosition"];
	    }
	}
	export class CutListResponse {
	    jobId: string;
	    jobName: string;
	    items: CutListItem[];
	
	    static createFrom(source: any = {}) {
	        return new CutListResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.jobId = source["jobId"];
	        this.jobName = source["jobName"];
	        this.items = this.convertValues(source["items"], CutListItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class DoorStyleRequest {
	    name: string;
	    family?: string;
	    variant?: string;
	    styleUse?: string;
	    stileWidth: number;
	    railWidth: number;
	    tenonLength: number;
	    panelThickness: number;
	    panelGap: number;
	
	    static createFrom(source: any = {}) {
	        return new DoorStyleRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.family = source["family"];
	        this.variant = source["variant"];
	        this.styleUse = source["styleUse"];
	        this.stileWidth = source["stileWidth"];
	        this.railWidth = source["railWidth"];
	        this.tenonLength = source["tenonLength"];
	        this.panelThickness = source["panelThickness"];
	        this.panelGap = source["panelGap"];
	    }
	}
	export class GlobalSearchResult {
	    type: string;
	    id: string;
	    title: string;
	    subtitle: string;
	    meta: string;
	
	    static createFrom(source: any = {}) {
	        return new GlobalSearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.id = source["id"];
	        this.title = source["title"];
	        this.subtitle = source["subtitle"];
	        this.meta = source["meta"];
	    }
	}
	
	export class JobPageRequest {
	    page: number;
	    pageSize: number;
	    search: string;
	    includeArchived?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new JobPageRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	        this.search = source["search"];
	        this.includeArchived = source["includeArchived"];
	    }
	}
	export class JobPageResponse {
	    items: Job[];
	    total: number;
	    page: number;
	    pageSize: number;
	
	    static createFrom(source: any = {}) {
	        return new JobPageResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], Job);
	        this.total = source["total"];
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class OverlayDataPayload {
	    version: number;
	    exportedAt?: string;
	    overlayCategories: OverlayCategory[];
	
	    static createFrom(source: any = {}) {
	        return new OverlayDataPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.exportedAt = source["exportedAt"];
	        this.overlayCategories = this.convertValues(source["overlayCategories"], OverlayCategory);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	export class QuickDoorCutListRequest {
	    name: string;
	    qty: number;
	    opWidth: number;
	    opHeight: number;
	    styleId: string;
	    doorType: string;
	    buttGap: number;
	    overlayType: string;
	    drawerFrontPosition: string;
	    panelLayout: string;
	    slabGrain: string;
	    useCustomOverlay: boolean;
	    overlayLeft: number;
	    overlayRight: number;
	    overlayTop: number;
	    overlayBottom: number;
	
	    static createFrom(source: any = {}) {
	        return new QuickDoorCutListRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.qty = source["qty"];
	        this.opWidth = source["opWidth"];
	        this.opHeight = source["opHeight"];
	        this.styleId = source["styleId"];
	        this.doorType = source["doorType"];
	        this.buttGap = source["buttGap"];
	        this.overlayType = source["overlayType"];
	        this.drawerFrontPosition = source["drawerFrontPosition"];
	        this.panelLayout = source["panelLayout"];
	        this.slabGrain = source["slabGrain"];
	        this.useCustomOverlay = source["useCustomOverlay"];
	        this.overlayLeft = source["overlayLeft"];
	        this.overlayRight = source["overlayRight"];
	        this.overlayTop = source["overlayTop"];
	        this.overlayBottom = source["overlayBottom"];
	    }
	}
	export class QuickDoorCutListResponse {
	    name: string;
	    finishedWidth: number;
	    finishedHeight: number;
	    leafWidth?: number;
	    items: CutListItem[];
	
	    static createFrom(source: any = {}) {
	        return new QuickDoorCutListResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.finishedWidth = source["finishedWidth"];
	        this.finishedHeight = source["finishedHeight"];
	        this.leafWidth = source["leafWidth"];
	        this.items = this.convertValues(source["items"], CutListItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UpdateJobRequest {
	    customerName: string;
	    project: string;
	    woodChoice?: string;
	    productionStatus: string;
	    defaultStyleId: string;
	    defaultOverlayCategoryId: string;
	    doorType: string;
	    buttGap: number;
	    useCustomOverlay: boolean;
	    overlayLeft: number;
	    overlayRight: number;
	    overlayTop: number;
	    overlayBottom: number;
	    defaultOverlay: number;
	
	    static createFrom(source: any = {}) {
	        return new UpdateJobRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customerName = source["customerName"];
	        this.project = source["project"];
	        this.woodChoice = source["woodChoice"];
	        this.productionStatus = source["productionStatus"];
	        this.defaultStyleId = source["defaultStyleId"];
	        this.defaultOverlayCategoryId = source["defaultOverlayCategoryId"];
	        this.doorType = source["doorType"];
	        this.buttGap = source["buttGap"];
	        this.useCustomOverlay = source["useCustomOverlay"];
	        this.overlayLeft = source["overlayLeft"];
	        this.overlayRight = source["overlayRight"];
	        this.overlayTop = source["overlayTop"];
	        this.overlayBottom = source["overlayBottom"];
	        this.defaultOverlay = source["defaultOverlay"];
	    }
	}
	export class UpdateSettingsRequest {
	    theme?: string;
	    measurementSystem?: string;
	    measurementConfirmed?: boolean;
	    onboardingDismissed?: boolean;
	    woodPresets?: string[];
	
	    static createFrom(source: any = {}) {
	        return new UpdateSettingsRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.measurementSystem = source["measurementSystem"];
	        this.measurementConfirmed = source["measurementConfirmed"];
	        this.onboardingDismissed = source["onboardingDismissed"];
	        this.woodPresets = source["woodPresets"];
	    }
	}
	export class WoodPresetsDataPayload {
	    version: number;
	    exportedAt?: string;
	    woodPresets: string[];
	
	    static createFrom(source: any = {}) {
	        return new WoodPresetsDataPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.exportedAt = source["exportedAt"];
	        this.woodPresets = source["woodPresets"];
	    }
	}

}

