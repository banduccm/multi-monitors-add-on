/*
Copyright (C) 2014  spin83

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, visit https://www.gnu.org/licenses/.
*/

const { Clutter, Gio } = imports.gi;

const Main = imports.ui.main;
var { ANIMATION_TIME } = imports.ui.overview;

const Config = imports.misc.config;
const GNOME_SHELL_VERSION = Config.PACKAGE_VERSION.split('.');

const ExtensionUtils = imports.misc.extensionUtils;
const MultiMonitors = ExtensionUtils.getCurrentExtension();
const Convenience = MultiMonitors.imports.convenience;

const MMLayout = MultiMonitors.imports.mmlayout;

const OVERRIDE_SCHEMA = 'org.gnome.shell.overrides';
const MUTTER_SCHEMA = 'org.gnome.mutter';
const WORKSPACES_ONLY_ON_PRIMARY_ID = 'workspaces-only-on-primary';

function copyClass (s, d) {
//    global.log(s.name +" > "+ d.name);
    let propertyNames = Reflect.ownKeys(s.prototype);
    for (let pName of propertyNames.values()) {

//        global.log(" ) "+pName.toString());
        if (typeof pName === "symbol") continue;
        if (d.prototype.hasOwnProperty(pName)) continue;
        if (pName === "prototype") continue;
        if (pName === "constructor") continue;
//        global.log(pName);
        let pDesc = Reflect.getOwnPropertyDescriptor(s.prototype, pName);
//        global.log(typeof pDesc);
        if (typeof pDesc !== 'object') continue;
        Reflect.defineProperty(d.prototype, pName, pDesc);
    }
};

function gnomeShellVersion() {
    return GNOME_SHELL_VERSION;
}

class MultiMonitorsAddOn {

    constructor() {
        this._settings = Convenience.getSettings();
        this._ov_settings = new Gio.Settings({ schema: OVERRIDE_SCHEMA });
        this._mu_settings = new Gio.Settings({ schema: MUTTER_SCHEMA });

        Main.mmLayoutManager = null;

        this._mmMonitors = 0;
        this.syncWorkspacesActualGeometry = null;
    }

    _relayout() {
		if(this._mmMonitors!=Main.layoutManager.monitors.length){
			this._mmMonitors = Main.layoutManager.monitors.length;
			global.log("pi:"+Main.layoutManager.primaryIndex);
			for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
				let monitor = Main.layoutManager.monitors[i];
					global.log("i:"+i+" x:"+monitor.x+" y:"+monitor.y+" w:"+monitor.width+" h:"+monitor.height);	
			}
		}
    }

    enable(version) {
		global.log("Enable Multi Monitors Add-On ("+version+")...")
		
		if(Main.panel.statusArea.MultiMonitorsAddOn)
			disable();
		
		this._mmMonitors = 0;
		
		Main.mmLayoutManager = new MMLayout.MultiMonitorsLayoutManager();
		Main.mmLayoutManager.showPanel();
		
		this._relayoutId = Main.layoutManager.connect('monitors-changed', this._relayout.bind(this));
		this._relayout();
    }

    disable() {
		Main.layoutManager.disconnect(this._relayoutId);
		this._ov_settings.disconnect(this._switchOffThumbnailsOvId);
		this._mu_settings.disconnect(this._switchOffThumbnailsMuId);
		
		this._settings.disconnect(this._showPanelId);
		
		this._hideIndicator();
		
		Main.mmLayoutManager.hidePanel();
		Main.mmLayoutManager = null;
		
		this._hideThumbnailsSlider();
		this._mmMonitors = 0;
		
		global.log("Disable Multi Monitors Add-On ...")
    }
}

var multiMonitorsAddOn = null;
var version = null;

function init() {
    Convenience.initTranslations();

    // fix bug in panel: Destroy function many time added to this same indicator.
    Main.panel._ensureIndicator = function(role) {
        let indicator = this.statusArea[role];
        if (indicator) {
            indicator.container.show();
            return null;
        }
        else {
            let constructor = PANEL_ITEM_IMPLEMENTATIONS[role];
            if (!constructor) {
                // This icon is not implemented (this is a bug)
                return null;
            }
            indicator = new constructor(this);
            this.statusArea[role] = indicator;
        }
        return indicator;
    };

    const metaVersion = MultiMonitors.metadata['version'];
    if (Number.isFinite(metaVersion)) {
        version = 'v'+Math.trunc(metaVersion);
        switch(Math.round((metaVersion%1)*10)) {
           case 0:
               break;
            case 1:
               version += '+bugfix';
               break;
            case 2:
               version += '+develop';
               break;
           default:
               version += '+modified';
                break;
        }
    }
    else
        version = metaVersion;
}

function enable() {
    if (multiMonitorsAddOn !== null)
        return;

    multiMonitorsAddOn = new MultiMonitorsAddOn();
    multiMonitorsAddOn.enable(version);
}

function disable() {
    if (multiMonitorsAddOn == null)
        return;

    multiMonitorsAddOn.disable();
    multiMonitorsAddOn = null;
}
