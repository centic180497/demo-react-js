;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported
    userConfirm
    dumpAnnotationRequest
    showMessage
    showOverlay
    uploadJobAnnotationRequest
    uploadTaskAnnotationRequest
    isDefaultFormat
*/

/* global
    Cookies:false
*/


Math.clamp = (x, min, max) => Math.min(Math.max(x, min), max);

String.customSplit = (string, separator) => {
    const regex = /"/gi;
    const occurences = [];
    let occurence = regex.exec(string);
    while (occurence) {
        occurences.push(occurence.index);
        occurence = regex.exec(string);
    }

    if (occurences.length % 2) {
        occurences.pop();
    }

    let copy = '';
    if (occurences.length) {
        let start = 0;
        for (let idx = 0; idx < occurences.length; idx += 2) {
            copy += string.substr(start, occurences[idx] - start);
            copy += string.substr(occurences[idx], occurences[idx + 1] - occurences[idx] + 1)
                .replace(new RegExp(separator, 'g'), '\0');
            start = occurences[idx + 1] + 1;
        }
        copy += string.substr(occurences[occurences.length - 1] + 1);
    } else {
        copy = string;
    }

    return copy.split(new RegExp(separator, 'g')).map(x => x.replace(/\0/g, separator));
};


function userConfirm(message, onagree, ondisagree) {
    const template = $('#confirmTemplate');
    const confirmWindow = $(template.html()).css('display', 'block');

    const annotationConfirmMessage = confirmWindow.find('.templateMessage');
    const agreeConfirm = confirmWindow.find('.templateAgreeButton');
    const disagreeConfirm = confirmWindow.find('.templateDisagreeButton');

    function hideConfirm() {
        agreeConfirm.off('click');
        disagreeConfirm.off('click');
        confirmWindow.remove();
    }

    annotationConfirmMessage.text(message);
    $('body').append(confirmWindow);

    agreeConfirm.on('click', () => {
        hideConfirm();
        if (onagree) {
            onagree();
        }
    });

    disagreeConfirm.on('click', () => {
        hideConfirm();
        if (ondisagree) {
            ondisagree();
        }
    });

    disagreeConfirm.focus();
    confirmWindow.on('keydown', (e) => {
        e.stopPropagation();
    });
}


function showMessage(message) {
    const template = $('#messageTemplate');
    const messageWindow = $(template.html()).css('display', 'block');

    const messageText = messageWindow.find('.templateMessage');
    const okButton = messageWindow.find('.templateOKButton');

    messageText.text(message);
    $('body').append(messageWindow);

    messageWindow.on('keydown', (e) => {
        e.stopPropagation();
    });

    okButton.on('click', () => {
        okButton.off('click');
        messageWindow.remove();
    });

    okButton.focus();
    return messageWindow;
}


function showOverlay(message) {
    const template = $('#overlayTemplate');
    const overlayWindow = $(template.html()).css('display', 'block');
    const overlayText = overlayWindow.find('.templateMessage');

    overlayWindow[0].getMessage = () => overlayText.html();
    overlayWindow[0].remove = () => overlayWindow.remove();
    overlayWindow[0].setMessage = (msg) => {
        overlayText.html(msg);
    };

    $('body').append(overlayWindow);
    overlayWindow[0].setMessage(message);
    return overlayWindow[0];
}

async function dumpAnnotationRequest(tid, taskName, format) {
    // URL Router on the server doesn't work correctly with slashes.
    // So, we have to replace them on the client side
    taskName = taskName.replace(/\//g, '_');
    const name = encodeURIComponent(`${tid}_${taskName}`);
    return new Promise((resolve, reject) => {
        const url = `/api/v1/tasks/${tid}/annotations/${name}`;
        let queryString = `format=${format}`;

        async function request() {
            $.get(`${url}?${queryString}`)
                .done((...args) => {
                    if (args[2].status === 202) {
                        setTimeout(request, 3000);
                    } else {
                        const a = document.createElement('a');
                        queryString = `${queryString}&action=download`;
                        a.href = `${url}?${queryString}`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        resolve();
                    }
                }).fail((errorData) => {
                    const message = `Can not dump annotations for the task. Code: ${errorData.status}. `
                        + `Message: ${errorData.responseText || errorData.statusText}`;
                    reject(new Error(message));
                });
        }

        setTimeout(request);
    });
}

async function uploadAnnoRequest(url, formData, format) {
    return new Promise((resolve, reject) => {
        const queryString = `format=${format}`;
        async function request(data) {
            try {
                await $.ajax({
                    url: `${url}?${queryString}`,
                    type: 'PUT',
                    data,
                    contentType: false,
                    processData: false,
                }).done((...args) => {
                    if (args[2].status === 202) {
                        setTimeout(() => request(''), 3000);
                    } else {
                        resolve();
                    }
                });
            } catch (errorData) {
                const message = `Can not upload annotations for the job. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                reject(new Error(message));
            }
        }

        setTimeout(() => request(formData));
    });
}

async function uploadJobAnnotationRequest(jid, formData, format) {
    return uploadAnnoRequest(`/api/v1/jobs/${jid}/annotations`, formData, format);
}

async function uploadTaskAnnotationRequest(tid, formData, format) {
    return uploadAnnoRequest(`/api/v1/tasks/${tid}/annotations`, formData, format);
}

/* These HTTP methods do not require CSRF protection */
function csrfSafeMethod(method) {
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}


$.ajaxSetup({
    beforeSend(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader('X-CSRFToken', Cookies.get('csrftoken'));
        }
    },
});


$(document).ready(() => {
    $('body').css({
        width: `${window.screen.width}px`,
        height: `${window.screen.height * 0.95}px`,
    });
});

function isDefaultFormat(dumperName, taskMode) {
    return (dumperName === 'CVAT XML 1.1 for videos' && taskMode === 'interpolation')
    || (dumperName === 'CVAT XML 1.1 for images' && taskMode === 'annotation');
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported Config */

class Config {
    constructor() {
        this._username = '_default_';
        this._shortkeys = {
            switch_lock_property: {
                value: 'l',
                view_value: 'L',
                description: 'switch lock property for active shape',
            },

            switch_all_lock_property: {
                value: 't l',
                view_value: 'T + L',
                description: 'switch lock property for all shapes on current frame',
            },

            switch_occluded_property: {
                value: 'q,/'.split(','),
                view_value: 'Q or Num Division',
                description: 'switch occluded property for active shape',
            },

            switch_draw_mode: {
                value: 'n',
                view_value: 'N',
                description: 'start draw / stop draw',
            },

            switch_merge_mode: {
                value: 'm',
                view_value: 'M',
                description: 'start merge / apply changes',
            },

            switch_group_mode: {
                value: 'g',
                view_value: 'G',
                description: 'start group / apply changes',
            },

            reset_group: {
                value: 'shift+g',
                view_value: 'Shift + G',
                description: 'reset group for selected shapes',
            },

            change_shape_label: {
                value: 'ctrl+1,ctrl+2,ctrl+3,ctrl+4,ctrl+5,ctrl+6,ctrl+7,ctrl+8,ctrl+9'.split(','),
                view_value: 'Ctrl + (1,2,3,4,5,6,7,8,9)',
                description: 'change shape label for existing object',
            },

            change_default_label: {
                value: 'shift+1,shift+2,shift+3,shift+4,shift+5,shift+6,shift+7,shift+8,shift+9'.split(','),
                view_value: 'Shift + (1,2,3,4,5,6,7,8,9)',
                description: 'change label default label',
            },

            change_shape_color: {
                value: 'enter',
                view_value: 'Enter',
                description: 'change color for highlighted shape',
            },

            change_player_brightness: {
                value: 'shift+b,alt+b'.split(','),
                view_value: 'Shift+B / Alt+B',
                description: 'increase/decrease brightness of an image',
            },

            change_player_contrast: {
                value: 'shift+c,alt+c'.split(','),
                view_value: 'Shift+C / Alt+C',
                description: 'increase/decrease contrast of an image',
            },

            change_player_saturation: {
                value: 'shift+s,alt+s'.split(','),
                view_value: 'Shift+S / Alt+S',
                description: 'increase/decrease saturation of an image',
            },

            switch_hide_mode: {
                value: 'h',
                view_value: 'H',
                description: 'switch hide mode for active shape',
            },

            switch_active_keyframe: {
                value: 'k',
                view_value: 'K',
                description: 'switch keyframe property for active shape',
            },

            switch_active_outside: {
                value: 'o',
                view_value: 'O',
                description: 'switch outside property for active shape',
            },

            switch_all_hide_mode: {
                value: 't h',
                view_value: 'T + H',
                description: 'switch hide mode for all shapes',
            },

            delete_shape: {
                value: 'del,shift+del'.split(','),
                view_value: 'Del, Shift + Del',
                description: 'delete active shape (use shift for force deleting)',
            },

            focus_to_frame: {
                value: '`,~'.split(','),
                view_value: '~ / `',
                description: 'focus to "go to frame" element',
            },

            next_frame: {
                value: 'f',
                view_value: 'F',
                description: 'move to next player frame',
            },

            prev_frame: {
                value: 'd',
                view_value: 'D',
                description: 'move to previous player frame',
            },

            forward_frame: {
                value: 'v',
                view_value: 'V',
                description: 'move forward several frames',
            },

            backward_frame: {
                value: 'c',
                view_value: 'C',
                description: 'move backward several frames',
            },

            next_key_frame: {
                value: 'r',
                view_value: 'R',
                description: 'move to next key frame of highlighted track',
            },

            prev_key_frame: {
                value: 'e',
                view_value: 'E',
                description: 'move to previous key frame of highlighted track',
            },

            prev_filter_frame: {
                value: 'left',
                view_value: 'Left Arrow',
                description: 'move to prev frame which satisfies the filter',
            },

            next_filter_frame: {
                value: 'right',
                view_value: 'Right Arrow',
                description: 'move to next frame which satisfies the filter',
            },

            play_pause: {
                value: 'space',
                view_value: 'Space',
                description: 'switch play / pause of player',
            },

            open_help: {
                value: 'f1',
                view_value: 'F1',
                description: 'open help window',
            },

            open_settings: {
                value: 'f2',
                view_value: 'F2',
                description: 'open settings window ',
            },

            save_work: {
                value: 'ctrl+s',
                view_value: 'Ctrl + S',
                description: 'save work on the server',
            },

            copy_shape: {
                value: 'ctrl+c',
                view_value: 'Ctrl + C',
                description: 'copy active shape to buffer',
            },

            propagate_shape: {
                value: 'ctrl+b',
                view_value: 'Ctrl + B',
                description: 'propagate active shape',
            },

            switch_paste: {
                value: 'ctrl+v',
                view_value: 'Ctrl + V',
                description: 'switch paste mode',
            },

            switch_aam_mode: {
                value: 'shift+enter',
                view_value: 'Shift + Enter',
                description: 'switch attribute annotation mode',
            },

            aam_next_attribute: {
                value: 'down',
                view_value: 'Down Arrow',
                description: 'move to next attribute in attribute annotation mode',
            },

            aam_prev_attribute: {
                value: 'up',
                view_value: 'Up Arrow',
                description: 'move to previous attribute in attribute annotation mode',
            },

            aam_next_shape: {
                value: 'tab',
                view_value: 'Tab',
                description: 'move to next shape in attribute annotation mode',
            },

            aam_prev_shape: {
                value: 'shift+tab',
                view_value: 'Shift + Tab',
                description: 'move to previous shape in attribute annotation mode',
            },

            select_i_attribute: {
                value: '1,2,3,4,5,6,7,8,9,0'.split(','),
                view_value: '1,2,3,4,5,6,7,8,9,0',
                description: 'setup corresponding attribute value in attribute annotation mode',
            },

            change_grid_opacity: {
                value: ['alt+g+=', 'alt+g+-'],
                view_value: 'Alt + G + "+", Alt + G + "-"',
                description: 'increase/decrease grid opacity',
            },

            change_grid_color: {
                value: 'alt+g+enter',
                view_value: 'Alt + G + Enter',
                description: 'change grid color',
            },

            undo: {
                value: 'ctrl+z',
                view_value: 'Ctrl + Z',
                description: 'undo',
            },

            redo: {
                value: ['ctrl+shift+z', 'ctrl+y'],
                view_value: 'Ctrl + Shift + Z / Ctrl + Y',
                description: 'redo',
            },

            cancel_mode: {
                value: 'esc',
                view_value: 'Esc',
                description: 'cancel active mode',
            },

            clockwise_rotation: {
                value: 'ctrl+r',
                view_value: 'Ctrl + R',
                description: 'clockwise image rotation',
            },

            counter_clockwise_rotation: {
                value: 'ctrl+shift+r',
                view_value: 'Ctrl + Shift + R',
                description: 'counter clockwise image rotation',
            },

            next_shape_type: {
                value: ['alt+.'],
                view_value: 'Alt + >',
                description: 'switch next default shape type',
            },

            prev_shape_type: {
                value: ['alt+,'],
                view_value: 'Alt + <',
                description: 'switch previous default shape type',
            },
        };

        if (window.cvat && window.cvat.job && window.cvat.job.z_order) {
            this._shortkeys.inc_z = {
                value: '+,='.split(','),
                view_value: '+',
                description: 'increase z order for active shape',
            };

            this._shortkeys.dec_z = {
                value: '-,_'.split(','),
                view_value: '-',
                description: 'decrease z order for active shape',
            };
        }

        this._settings = {
            player_step: {
                value: '10',
                description: 'step size for player when move on several frames forward/backward',
            },

            player_speed: {
                value: '25 FPS',
                description: 'playback speed of the player',
            },

            reset_zoom: {
                value: 'false',
                description: 'reset frame zoom when move between the frames',
            },

            enable_auto_save: {
                value: 'false',
                description: 'enable auto save ability',
            },

            auto_save_interval: {
                value: '15',
                description: 'auto save interval (min)',
            },
        };

        this._defaultShortkeys = JSON.parse(JSON.stringify(this._shortkeys));
        this._defaultSettings = JSON.parse(JSON.stringify(this._settings));
    }


    reset() {
        this._shortkeys = JSON.parse(JSON.stringify(this._defaultShortkeys));
        this._settings = JSON.parse(JSON.stringify(this._defaultSettings));
    }


    get shortkeys() {
        return JSON.parse(JSON.stringify(this._shortkeys));
    }


    get settings() {
        return JSON.parse(JSON.stringify(this._settings));
    }
}

;
            window.UI_URL = "http://10.49.46.251:7080";
        
;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported Logger */

/* global
    Cookies:false
*/

"use strict";

class UserActivityHandler {
    constructor() {
        this._TIME_TRESHHOLD = 100000; //ms
        this._prevEventTime = Date.now();
        this._workingTime = 0;
    }

    updateTimer() {
        if (document.hasFocus()) {
            let now = Date.now();
            let diff = now - this._prevEventTime;
            this._prevEventTime = now;
            this._workingTime += diff < this._TIME_TRESHHOLD ? diff : 0;
        }
    }

    resetTimer() {
        this._prevEventTime = Date.now();
        this._workingTime = 0;
    }

    getWorkingTime() {
        return this._workingTime;
    }
}

class LogCollection extends Array {
    constructor(logger, items) {
        super(items.length);
        for (let i = 0; i < items.length; i++) {
            super[i] = items[i];
        }
        this._loggerHandler = logger;
    }

    save() {
        this._loggerHandler.pushLogs(this);
    }

    export() {
        return Array.from(this, log => log.serialize());
    }
}

class LoggerHandler {
    constructor(jobId) {
        this._clientID = Date.now().toString().substr(-6);
        this._jobId = jobId;
        this._logEvents = [];
        this._userActivityHandler = new UserActivityHandler();
        this._timeThresholds = {};
    }

    addEvent(event) {
        this._pushEvent(event);
    }

    addContinuedEvent(event) {
        this._userActivityHandler.updateTimer();
        event.onCloseCallback = this._closeCallback.bind(this);
        return event;
    }

    sendExceptions(exception) {
        this._extendEvent(exception);
        return new Promise((resolve, reject) => {
            let retries = 3;
            let makeRequest = () => {
                let xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/v1/server/exception');
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader("X-CSRFToken", Cookies.get('csrftoken'));
                let onreject = () => {
                    if (retries--) {
                        setTimeout(() => makeRequest(), 30000); //30 sec delay
                    } else {
                        let payload = exception.serialize();
                        delete Object.assign(payload, {origin_message: payload.message }).message;
                        this.addEvent(new Logger.LogEvent(
                            Logger.EventType.sendException,
                            payload,
                            "Can't send exception",
                        ));
                        reject({
                            status: xhr.status,
                            statusText: xhr.statusText,
                        });
                    }
                };
                xhr.onload = () => {
                    switch (xhr.status) {
                        case 201:
                        case 403: // ignore forbidden response
                            resolve(xhr.response);
                            break;

                        default:
                            onreject();
                    }
                };
                xhr.onerror = () => {
                    //  if status === 0 a request is a failure on the network level, ignore it
                    if (xhr.status === 0) {
                        resolve(xhr.response);
                    } else {
                        onreject();
                    }
                };
                xhr.send(JSON.stringify(exception.serialize()));
            };
            makeRequest();
        });
    }

    getLogs() {
        let logs = new LogCollection(this, this._logEvents);
        this._logEvents.length = 0;
        return logs;
    }

    pushLogs(logEvents) {
        Array.prototype.push.apply(this._logEvents, logEvents);
    }

    _extendEvent(event) {
        event._jobId = this._jobId;
        event._clientId = this._clientID;
    }

    _pushEvent(event) {
        this._extendEvent(event);
        if (event._type in this._timeThresholds) {
            this._timeThresholds[event._type].wait(event);
        }
        else {
            this._logEvents.push(event);
        }
        this._userActivityHandler.updateTimer();
    }

    _closeCallback(event) {
        this._pushEvent(event);
    }

    updateTimer() {
        this._userActivityHandler.updateTimer();
    }

    resetTimer() {
        this._userActivityHandler.resetTimer();
    }

    getWorkingTime() {
        return this._userActivityHandler.getWorkingTime();
    }

    setTimeThreshold(eventType, threshold) {
        this._timeThresholds[eventType] = {
            _threshold: threshold,
            _timeoutHandler: null,
            _timestamp: 0,
            _event: null,
            _logEvents: this._logEvents,
            wait: function(event) {
                if (this._event) {
                    if (this._timeoutHandler) {
                        clearTimeout(this._timeoutHandler);
                    }
                }
                else {
                    this._timestamp = event._timestamp;
                }
                this._event = event;
                this._timeoutHandler = setTimeout(() => {
                    if ('duration' in this._event._values) {
                        this._event._values.duration += this._event._timestamp - this._timestamp;
                    }
                    this._event._timestamp = this._timestamp;
                    this._logEvents.push(this._event);
                    this._event = null;
                }, threshold);
            },
        };
    }
}


/*
Log message has simple json format - each message is set of "key" : "value"
pairs inside curly braces - {"key1" : "string_value", "key2" : number_value,
...} Value may be string or number (see json spec) required fields for all event
types:

    NAME         TYPE           DESCRIPTION
"event"         string          see EventType enum description of possible values.
"timestamp"     number          timestamp in UNIX format - the number of seconds
                                or milliseconds that have elapsed since 00:00:00
                                Thursday, 1 January 1970
"application"   string          application name
"userid"        string          Unique userid
"task"          string          Unique task id. (Is expected corresponding Jira task id)

"count" is requiered field for "Add object", "Delete object", "Copy track",
"Propagate object", "Merge objecrs", "Undo action" and "Redo action" events with
number value.

Example : { "event" : "Add object", "timestamp" : 1486040342867, "application" :
"CVAT", "duration" : 4200, "userid" : "ESAZON1X-MOBL", "count" : 1, "type" :
"bounding box" }

Types of supported events. Minimum subset of events to generate simple report
are Logger.EventType.addObject, Logger.EventType.deleteObject and
Logger.EventType.sendTaskInfo. Value of "count" property should be a number.
*/

class LoggerEvent {
    constructor(type, message) {
        this._time = new Date().toISOString();
        this._clientId = null;
        this._jobId = null;
        this._type = type;
        this._message = message;
    }

    serialize() {
        let serializedObj = {
            job_id: this._jobId,
            client_id: this._clientId,
            name: Logger.eventTypeToString(this._type),
            time: this._time,
        };
        if (this._message) {
            Object.assign(serializedObj, { message: this._message,});
        }
        return serializedObj;
    }
}

var Logger = {
    /**
     * @private
     */
    _logger: null,
    _userActivityHandler: null,

    /**
     * Logger.LogEvent class declaration
     * @param {Logger.EventType} type Type of event
     * @param {Object} values Any event values, for example {count: 1, label: 'vehicle'}
     * @param {Function} closeCallback callback function which will be called by close method. Setted by
     */
    LogEvent: class extends LoggerEvent {
        constructor(type, values, message) {
            super(type, message);

            this._timestamp = Date.now();
            this.onCloseCallback = null;
            this._is_active = document.hasFocus();
            this._values = values || {};
        }

        serialize() {
            return Object.assign(super.serialize(), {
                payload: this._values,
                is_active: this._is_active,
            });
        };

        close(endTimestamp) {
            if (this.onCloseCallback) {
                this.addValues({
                    duration: endTimestamp ? endTimestamp - this._timestamp : Date.now() - this._timestamp,
                });
                this.onCloseCallback(this);
            }
        };

        addValues(values) {
            Object.assign(this._values, values);
        };
    },

    ExceptionEvent: class extends LoggerEvent {
        constructor(message, filename, line, column, stack, client, system) {
            super(Logger.EventType.sendException, message);

            this._client = client;
            this._column = column;
            this._filename = filename;
            this._line = line;
            this._stack = stack;
            this._system = system;
        }

        serialize() {
            return Object.assign(super.serialize(), {
                client: this._client,
                column: this._column,
                filename: this._filename,
                line: this._line,
                stack: this._stack,
                system: this._system,
            });
        };
    },

    /**
     * Logger.EventType Enumeration.
     */
    EventType: {
        // dumped as "Paste object". There are no additional required fields.
        pasteObject: 0,
        // dumped as "Change attribute". There are no additional required
        // fields.
        changeAttribute: 1,
        // dumped as "Drag object". There are no additional required fields.
        dragObject: 2,
        // dumped as "Delete object". "count" is required field, value of
        // deleted objects should be positive number.
        deleteObject: 3,
        // dumped as "Press shortcut". There are no additional required fields.
        pressShortcut: 4,
        // dumped as "Resize object". There are no additional required fields.
        resizeObject: 5,
        // dumped as "Send logs". It's expected that event has "duration" field,
        // but it isn't necessary.
        sendLogs: 6,
        // dumped as "Save job". It's expected that event has "duration" field,
        // but it isn't necessary.
        saveJob: 7,
        // dumped as "Jump frame". There are no additional required fields.
        jumpFrame: 8,
        // dumped as "Draw object". It's expected that event has "duration"
        // field, but it isn't necessary.
        drawObject: 9,
        // dumped as "Change label".
        changeLabel: 10,
        // dumped as "Send task info". "track count", "frame count", "object
        // count" are required fields. It's expected that event has
        // "current_frame" field.
        sendTaskInfo: 11,
        // dumped as "Load job". "track count", "frame count", "object count"
        // are required fields. It's expected that event has "duration" field,
        // but it isn't necessary.
        loadJob: 12,
        // dumped as "Move image". It's expected that event has "duration"
        // field, but it isn't necessary.
        moveImage: 13,
        // dumped as "Zoom image". It's expected that event has "duration"
        // field, but it isn't necessary.
        zoomImage: 14,
        // dumped as "Lock object". There are no additional required fields.
        lockObject: 15,
        // dumped as "Merge objects". "count" is required field with positive or
        // negative number value.
        mergeObjects: 16,
        // dumped as "Copy object". "count" is required field with number value.
        copyObject: 17,
        // dumped as "Propagate object". "count" is required field with number
        // value.
        propagateObject: 18,
        // dumped as "Undo action". "count" is required field with positive or
        // negative number value.
        undoAction: 19,
        // dumped as "Redo action". "count" is required field with positive or
        // negative number value.
        redoAction: 20,
        // dumped as "Send user activity". "working_time" is required field with
        // positive number value.
        sendUserActivity: 21,
        // dumped as "Send exception". Use to send any exception events to the
        // server. "message", "filename", "line" are mandatory fields. "stack"
        // and "column" are optional.
        sendException: 22,
        // dumped as "Change frame". There are no additional required fields.
        changeFrame: 23,
        // dumped as "Debug info". There are no additional required fields.
        debugInfo: 24,
        // dumped as "Fit image". There are no additional required fields.
        fitImage: 25,
        // dumped as "Rotate image". There are no additional required fields.
        rotateImage: 26,
    },

    /**
     * Logger.initializeLogger
     * @param {String} applicationName application name
     * @param {String} taskId Task identificator (i.e. link to Jira)
     * @param {String} serverURL server url to recive logs
     * @return {Bool} true if initialization was succeed
     * @static
     */
    initializeLogger: function(jobId) {
        if (!this._logger)
        {
            this._logger = new LoggerHandler(jobId);
            return true;
        }
        return false;
    },

    /**
     * Logger.addEvent Use this method to add a log event without duration field.
     * @param {Logger.EventType} type Event Type
     * @param {Object} values Any event values, for example {count: 1, label: 'vehicle'}
     * @param {String} message Any string message. Empty by default.
     * @static
     */
    addEvent: function(type, values, message='') {
        this._logger.addEvent(new Logger.LogEvent(type, values, message));
    },

    /**
     * Logger.addContinuedEvent Use to add log event with duration field.
     * Duration will be calculated automatically when LogEvent.close() method of
     * returned Object will be called. Note: in case of LogEvent.close() method
     * will not be callsed event will not be sent to server
     * @param {Logger.EventType} type Event Type
     * @param {Object} values Any event values, for example {count: 1, label:
     * 'vehicle'}
     * @param {String} message Any string message. Empty by default.
     * @return {LogEvent} instance of LogEvent
     * @static
     */
    addContinuedEvent: function(type, values, message='') {
        return this._logger.addContinuedEvent(new Logger.LogEvent(type, values, message));
    },

    /**
     * Logger.shortkeyLogDecorator use for decorating the shortkey handlers.
     * This decorator just create appropriate log event and close it when
     * decored function will performed.
     * @param {Function} decoredFunc is function for decorating
     * @return {Function} is decorated decoredFunc
     * @static
     */
    shortkeyLogDecorator: function(decoredFunc) {
        let self = this;
        return function(e, combo) {
            let pressKeyEvent = self.addContinuedEvent(self.EventType.pressShortcut, {key:  combo});
            let returnValue = decoredFunc(e, combo);
            pressKeyEvent.close();
            return returnValue;
        };
    },

    /**
     * Logger.sendLogs Try to send exception logs to the server immediately.
     * @return {Promise}
     * @param {LogEvent} exceptionEvent
     * @static
     */

    sendException: function(message, filename, line, column, stack, client, system) {
        return this._logger.sendExceptions(
            new Logger.ExceptionEvent(
                message,
                filename,
                line,
                column,
                stack,
                client,
                system
            )
        );
    },

    /**
     * Logger.getLogs Remove and return collected Array of LogEvents from Logger
     * @return {Array}
     * @static
     */
    getLogs: function(appendUserActivity=true)
    {
        if (appendUserActivity)
        {
            this.addEvent(Logger.EventType.sendUserActivity, {'working time': this._logger.getWorkingTime()});
            this._logger.resetTimer();
        }

        return this._logger.getLogs();
    },

    /** Logger.updateUserActivityTimer method updates internal timer for working
     * time calculation logic
     * @static
     */
    updateUserActivityTimer: function()
    {
        this._logger.updateTimer();
    },

    /** Logger.setTimeThreshold set time threshold in ms for EventType. If time
     * interval betwwen incoming log events less than threshold events will be
     * collapsed. Note that result event will have timestamp of first event, In
     * case of time threshold used for continued event duration will be
     * difference between first and last event timestamps and other fields from
     * last event.
     * @static
     * @param {Logger.EventType} eventType
     * @param {Number} threshold
     */
    setTimeThreshold: function(eventType, threshold=500)
    {
        this._logger.setTimeThreshold(eventType, threshold);
    },

    /** Logger._eventTypeToString private method to transform Logger.EventType
     * to string
     * @param {Logger.EventType} type Event Type
     * @return {String} string reppresentation of Logger.EventType
     * @static
     */
    eventTypeToString: function(type)
    {
        switch(type) {
        case this.EventType.pasteObject: return 'Paste object';
        case this.EventType.changeAttribute: return 'Change attribute';
        case this.EventType.dragObject: return 'Drag object';
        case this.EventType.deleteObject: return 'Delete object';
        case this.EventType.pressShortcut: return 'Press shortcut';
        case this.EventType.resizeObject: return 'Resize object';
        case this.EventType.sendLogs: return 'Send logs';
        case this.EventType.saveJob: return 'Save job';
        case this.EventType.jumpFrame: return 'Jump frame';
        case this.EventType.drawObject: return 'Draw object';
        case this.EventType.changeLabel: return 'Change label';
        case this.EventType.sendTaskInfo: return 'Send task info';
        case this.EventType.loadJob: return 'Load job';
        case this.EventType.moveImage: return 'Move image';
        case this.EventType.zoomImage: return 'Zoom image';
        case this.EventType.lockObject: return 'Lock object';
        case this.EventType.mergeObjects: return 'Merge objects';
        case this.EventType.copyObject: return 'Copy object';
        case this.EventType.propagateObject: return 'Propagate object';
        case this.EventType.undoAction: return 'Undo action';
        case this.EventType.redoAction: return 'Redo action';
        case this.EventType.sendUserActivity: return 'Send user activity';
        case this.EventType.sendException: return 'Send exception';
        case this.EventType.changeFrame: return 'Change frame';
        case this.EventType.debugInfo: return 'Debug info';
        case this.EventType.fitImage: return 'Fit image';
        case this.EventType.rotateImage: return 'Rotate image';
        default: return 'Unknown';
        }
    },
};

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported encodeFilePathToURI */

function encodeFilePathToURI(path) {
    return path.split('/').map(x => encodeURIComponent(x)).join('/');
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported Listener */
"use strict";

class Listener {
    constructor(notifyCallbackName, getStateCallback) {
        this._listeners = [];
        this._notifyCallbackName = notifyCallbackName;
        this._getStateCallback = getStateCallback;
    }

    subscribe(listener) {
        if (typeof(listener) != 'object') {
            throw Error('Bad listener for subscribe found. Listener is not object.');
        }

        if (typeof(listener[this._notifyCallbackName]) != 'function') {
            throw Error('Bad listener for subscribe found. Listener does not have a callback function ' + this._notifyCallbackName);
        }

        if (this._listeners.indexOf(listener) === -1) {
            this._listeners.push(listener);
        }
    }

    unsubscribeAll() {
        this._listeners = [];
    }

    unsubscribe(listener) {
        let idx = this._listeners.indexOf(listener);
        if (idx != -1) {
            this._listeners.splice(idx,1);
        }
        else {
            throw Error('Unknown listener for unsubscribe');
        }
    }

    notify() {
        let state = this._getStateCallback();
        for (let listener of this._listeners) {
            listener[this._notifyCallbackName](state);
        }
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported HistoryModel HistoryController HistoryView */

/* global
    Listener:false
    Logger:false
    Mousetrap:false
*/
"use strict";

class HistoryModel extends Listener {
    constructor(playerModel) {
        super('onHistoryUpdate', () => this );

        this._deep = 128;
        this._id = 0;
        this._undo_stack = [];
        this._redo_stack = [];
        this._locked = false;
        this._player = playerModel;

        window.cvat.addAction = (name, undo, redo, frame) => this.addAction(name, undo, redo, frame);
    }

    undo() {
        let frame = window.cvat.player.frames.current;
        let undo = this._undo_stack.pop();

        if (undo) {
            try {
                Logger.addEvent(Logger.EventType.undoAction, {
                    name: undo.name,
                    frame: undo.frame,
                });

                if (undo.frame != frame) {
                    this._player.shift(undo.frame, true);
                }
                this._locked = true;
                undo.undo();
            }
            catch(err) {
                this.notify();
                throw err;
            }
            finally {
                this._locked = false;
            }

            this._redo_stack.push(undo);
        }

        this.notify();
    }

    redo() {
        let frame = window.cvat.player.frames.current;
        let redo = this._redo_stack.pop();

        if (redo) {
            try {
                Logger.addEvent(Logger.EventType.redoAction, {
                    name: redo.name,
                    frame: redo.frame,
                });

                if (redo.frame != frame) {
                    this._player.shift(redo.frame, true);
                }
                this._locked = true;
                redo.redo();
            }
            catch(err) {
                this.notify();
                throw err;
            }
            finally {
                this._locked = false;
            }

            this._undo_stack.push(redo);
        }

        this.notify();
    }

    addAction(name, undo, redo, frame) {
        if (this._locked) return;
        if (this._undo_stack.length >= this._deep) {
            this._undo_stack.shift();
        }

        this._undo_stack.push({
            name: name,
            undo: undo,
            redo: redo,
            frame: frame,
            id: this._id++,
        });
        this._redo_stack = [];
        this.notify();
    }

    empty() {
        this._undo_stack = [];
        this._redo_stack = [];
        this._id = 0;
        this.notify();
    }

    get undoLength() {
        return this._undo_stack.length;
    }

    get redoLength() {
        return this._redo_stack.length;
    }

    get lastUndoText() {
        let lastUndo = this._undo_stack[this._undo_stack.length - 1];
        if (lastUndo) {
            return `${lastUndo.name} [Frame ${lastUndo.frame}] [Id ${lastUndo.id}]`;
        }
        else return 'None';
    }

    get lastRedoText() {
        let lastRedo = this._redo_stack[this._redo_stack.length - 1];
        if (lastRedo) {
            return `${lastRedo.name} [Frame ${lastRedo.frame}] [Id ${lastRedo.id}]`;
        }
        else return 'None';
    }
}


class HistoryController {
    constructor(model) {
        this._model = model;
        setupCollectionShortcuts.call(this);

        function setupCollectionShortcuts() {
            let undoHandler = Logger.shortkeyLogDecorator(function(e) {
                this.undo();
                e.preventDefault();
            }.bind(this));

            let redoHandler = Logger.shortkeyLogDecorator(function(e) {
                this.redo();
                e.preventDefault();
            }.bind(this));

            let shortkeys = window.cvat.config.shortkeys;
            Mousetrap.bind(shortkeys["undo"].value, undoHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["redo"].value, redoHandler.bind(this), 'keydown');
        }
    }

    undo() {
        if (!window.cvat.mode) {
            this._model.undo();
        }
    }

    redo() {
        if (!window.cvat.mode) {
            this._model.redo();
        }
    }
}


class HistoryView {
    constructor(controller, model) {
        this._controller = controller;
        this._undoButton = $('#undoButton');
        this._redoButton = $('#redoButton');
        this._lastUndoText = $('#lastUndoText');
        this._lastRedoText = $('#lastRedoText');

        let shortkeys = window.cvat.config.shortkeys;
        this._undoButton.attr('title', `${shortkeys['undo'].view_value} - ${shortkeys['undo'].description}`);
        this._redoButton.attr('title', `${shortkeys['redo'].view_value} - ${shortkeys['redo'].description}`);

        this._undoButton.on('click', () => {
            this._controller.undo();
        });

        this._redoButton.on('click', () => {
            this._controller.redo();
        });

        model.subscribe(this);
    }

    onHistoryUpdate(model) {
        if (model.undoLength) {
            this._undoButton.prop('disabled', false);
        }
        else {
            this._undoButton.prop('disabled', true);
        }

        if (model.redoLength) {
            this._redoButton.prop('disabled', false);
        }
        else {
            this._redoButton.prop('disabled', true);
        }

        this._lastUndoText.text(model.lastUndoText);
        this._lastRedoText.text(model.lastRedoText);
    }
}

;/*
 * Copyright (C) 2019 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported BorderSticker */

class BorderSticker {
    constructor(currentShape, frameContent, shapes, scale) {
        this._currentShape = currentShape;
        this._frameContent = frameContent;
        this._enabled = false;
        this._groups = null;
        this._scale = scale;
        this._accounter = {
            clicks: [],
            shapeID: null,
        };

        const transformedShapes = shapes
            .filter((shape) => !shape.model.removed)
            .map((shape) => {
                const pos = shape.interpolation.position;
                // convert boxes to point sets
                if (!('points' in pos)) {
                    return {
                        points: window.cvat.translate.points
                            .actualToCanvas(`${pos.xtl},${pos.ytl} ${pos.xbr},${pos.ytl}`
                                + ` ${pos.xbr},${pos.ybr} ${pos.xtl},${pos.ybr}`),
                        color: shape.model.color.shape,
                    };
                }

                return {
                    points: window.cvat.translate.points
                        .actualToCanvas(pos.points),
                    color: shape.model.color.shape,
                };
            });

        this._drawBorderMarkers(transformedShapes);
    }

    _addRawPoint(x, y) {
        this._currentShape.array().valueOf().pop();
        this._currentShape.array().valueOf().push([x, y]);
        // not error, specific of the library
        this._currentShape.array().valueOf().push([x, y]);
        const paintHandler = this._currentShape.remember('_paintHandler');
        paintHandler.drawCircles();
        paintHandler.set.members.forEach((el) => {
            el.attr('stroke-width', 1 / this._scale).attr('r', 2.5 / this._scale);
        });
        this._currentShape.plot(this._currentShape.array().valueOf());
    }

    _drawBorderMarkers(shapes) {
        const namespace = 'http://www.w3.org/2000/svg';

        this._groups = shapes.reduce((acc, shape, shapeID) => {
            // Group all points by inside svg groups
            const group = window.document.createElementNS(namespace, 'g');
            shape.points.split(/\s/).map((point, pointID, points) => {
                const [x, y] = point.split(',').map((coordinate) => +coordinate);
                const circle = window.document.createElementNS(namespace, 'circle');
                circle.classList.add('shape-creator-border-point');
                circle.setAttribute('fill', shape.color);
                circle.setAttribute('stroke', 'black');
                circle.setAttribute('stroke-width', 1 / this._scale);
                circle.setAttribute('cx', +x);
                circle.setAttribute('cy', +y);
                circle.setAttribute('r', 5 / this._scale);

                circle.doubleClickListener = (e) => {
                    // Just for convenience (prevent screen fit feature)
                    e.stopPropagation();
                };

                circle.clickListener = (e) => {
                    e.stopPropagation();
                    // another shape was clicked
                    if (this._accounter.shapeID !== null && this._accounter.shapeID !== shapeID) {
                        this.reset();
                    }

                    this._accounter.shapeID = shapeID;

                    if (this._accounter.clicks[1] === pointID) {
                        // the same point repeated two times
                        const [_x, _y] = point.split(',').map((coordinate) => +coordinate);
                        this._addRawPoint(_x, _y);
                        this.reset();
                        return;
                    }

                    // the first point can not be clicked twice
                    if (this._accounter.clicks[0] !== pointID) {
                        this._accounter.clicks.push(pointID);
                    } else {
                        return;
                    }

                    // up clicked group for convenience
                    this._frameContent.node.appendChild(group);

                    // the first click
                    if (this._accounter.clicks.length === 1) {
                        // draw and remove initial point just to initialize data structures
                        if (!this._currentShape.remember('_paintHandler').startPoint) {
                            this._currentShape.draw('point', e);
                            this._currentShape.draw('undo');
                        }

                        const [_x, _y] = point.split(',').map((coordinate) => +coordinate);
                        this._addRawPoint(_x, _y);
                    // the second click
                    } else if (this._accounter.clicks.length === 2) {
                        circle.classList.add('shape-creator-border-point-direction');
                    // the third click
                    } else {
                        // sign defines bypass direction
                        const landmarks = this._accounter.clicks;
                        const sign = Math.sign(landmarks[2] - landmarks[0])
                            * Math.sign(landmarks[1] - landmarks[0])
                            * Math.sign(landmarks[2] - landmarks[1]);

                        // go via a polygon and get vertexes
                        // the first vertex has been already drawn
                        const way = [];
                        for (let i = landmarks[0] + sign; ; i += sign) {
                            if (i < 0) {
                                i = points.length - 1;
                            } else if (i === points.length) {
                                i = 0;
                            }

                            way.push(points[i]);

                            if (i === this._accounter.clicks[this._accounter.clicks.length - 1]) {
                                // put the last element twice
                                // specific of svg.draw.js
                                // way.push(points[i]);
                                break;
                            }
                        }

                        // remove the latest cursor position from drawing array
                        for (const wayPoint of way) {
                            const [_x, _y] = wayPoint.split(',').map((coordinate) => +coordinate);
                            this._addRawPoint(_x, _y);
                        }

                        this.reset();
                    }
                };

                circle.addEventListener('click', circle.clickListener);
                circle.addEventListener('dblclick', circle.doubleClickListener);

                return circle;
            }).forEach((circle) => group.appendChild(circle));

            acc.push(group);
            return acc;
        }, []);

        this._groups
            .forEach((group) => this._frameContent.node.appendChild(group));
    }

    reset() {
        if (this._accounter.shapeID !== null) {
            while (this._accounter.clicks.length > 0) {
                const resetID = this._accounter.clicks.pop();
                this._groups[this._accounter.shapeID]
                    .children[resetID].classList.remove('shape-creator-border-point-direction');
            }
        }

        this._accounter = {
            clicks: [],
            shapeID: null,
        };
    }

    disable() {
        if (this._groups) {
            this._groups.forEach((group) => {
                Array.from(group.children).forEach((circle) => {
                    circle.removeEventListener('click', circle.clickListener);
                    circle.removeEventListener('dblclick', circle.doubleClickListener);
                });

                group.remove();
            });

            this._groups = null;
        }
    }

    scale(scale) {
        this._scale = scale;
        if (this._groups) {
            this._groups.forEach((group) => {
                Array.from(group.children).forEach((circle) => {
                    circle.setAttribute('r', 5 / scale);
                    circle.setAttribute('stroke-width', 1 / scale);
                });
            });
        }
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported CoordinateTranslator */
"use strict";

class CoordinateTranslator {
    constructor() {
        this._boxTranslator = {
            _playerOffset: 0,
            _convert(box, sign) {
                for (const prop of ['xtl', 'ytl', 'xbr', 'ybr', 'x', 'y']) {
                    if (prop in box) {
                        box[prop] += this._playerOffset * sign;
                    }
                }

                return box;
            },
            actualToCanvas(actualBox) {
                const canvasBox = {};
                for (const key in actualBox) {
                    canvasBox[key] = actualBox[key];
                }

                return this._convert(canvasBox, 1);
            },

            canvasToActual(canvasBox) {
                const actualBox = {};
                for (const key in canvasBox) {
                    actualBox[key] = canvasBox[key];
                }

                return this._convert(actualBox, -1);
            },

            canvasToClient(sourceCanvas, canvasBox) {
                const points = [
                    [canvasBox.x, canvasBox.y],
                    [canvasBox.x + canvasBox.width, canvasBox.y],
                    [canvasBox.x, canvasBox.y + canvasBox.height],
                    [canvasBox.x + canvasBox.width, canvasBox.y + canvasBox.height],
                ].map(el => window.cvat.translate.point.canvasToClient(sourceCanvas, ...el));

                const xes = points.map(el => el.x);
                const yes = points.map(el => el.y);

                const xmin = Math.min(...xes);
                const xmax = Math.max(...xes);
                const ymin = Math.min(...yes);
                const ymax = Math.max(...yes);

                return {
                    x: xmin,
                    y: ymin,
                    width: xmax - xmin,
                    height: ymax - ymin,
                };
            },

            serverToClient(shape) {
                return {
                    xtl: shape.points[0],
                    ytl: shape.points[1],
                    xbr: shape.points[2],
                    ybr: shape.points[3],
                };
            },

            clientToServer(clientObject) {
                return {
                    points: [clientObject.xtl, clientObject.ytl,
                        clientObject.xbr, clientObject.ybr],
                };
            },
        };

        this._pointsTranslator = {
            _playerOffset: 0,
            _convert(points, sign) {
                if (typeof (points) === 'string') {
                    return points.split(' ').map(coord => coord.split(',')
                        .map(x => +x + this._playerOffset * sign).join(',')).join(' ');
                }
                if (typeof (points) === 'object') {
                    return points.map(point => ({
                        x: point.x + this._playerOffset * sign,
                        y: point.y + this._playerOffset * sign,
                    }));
                }
                throw Error('Unknown points type was found');
            },
            actualToCanvas(actualPoints) {
                return this._convert(actualPoints, 1);
            },

            canvasToActual(canvasPoints) {
                return this._convert(canvasPoints, -1);
            },

            serverToClient(shape) {
                return {
                    points: shape.points.reduce((acc, el, idx) => {
                        if (idx % 2) {
                            acc.slice(-1)[0].push(el);
                        } else {
                            acc.push([el]);
                        }
                        return acc;
                    }, []).map(point => point.join(',')).join(' '),
                };
            },

            clientToServer(clientPoints) {
                return {
                    points: clientPoints.points.split(' ').join(',').split(',').map(x => +x),
                };
            },
        };

        this._pointTranslator = {
            _rotation: 0,
            clientToCanvas(targetCanvas, clientX, clientY) {
                let pt = targetCanvas.createSVGPoint();
                pt.x = clientX;
                pt.y = clientY;
                pt = pt.matrixTransform(targetCanvas.getScreenCTM().inverse());
                return pt;
            },
            canvasToClient(sourceCanvas, canvasX, canvasY) {
                let pt = sourceCanvas.createSVGPoint();
                pt.x = canvasX;
                pt.y = canvasY;
                pt = pt.matrixTransform(sourceCanvas.getScreenCTM());
                return pt;
            },
            rotate(x, y, cx, cy) {
                cx = (typeof cx === 'undefined' ? 0 : cx);
                cy = (typeof cy === 'undefined' ? 0 : cy);

                const radians = (Math.PI / 180) * window.cvat.player.rotation;
                const cos = Math.cos(radians);
                const sin = Math.sin(radians);

                return {
                    x: (cos * (x - cx)) + (sin * (y - cy)) + cx,
                    y: (cos * (y - cy)) - (sin * (x - cx)) + cy,
                };
            },
        };
    }

    get box() {
        return this._boxTranslator;
    }

    get points() {
        return this._pointsTranslator;
    }

    get point() {
        return this._pointTranslator;
    }

    set playerOffset(value) {
        this._boxTranslator._playerOffset = value;
        this._pointsTranslator._playerOffset = value;
    }

    set rotation(value) {
        this._pointTranslator._rotation = value;
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported LabelsInfo */

class LabelsInfo {
    constructor(labels) {
        function convertAttribute(attribute) {
            return {
                mutable: attribute.mutable,
                type: attribute.input_type,
                name: attribute.name,
                values: attribute.input_type === 'checkbox'
                    ? [attribute.values[0].toLowerCase() !== 'false'] : attribute.values,
            };
        }

        this._labels = {};
        this._attributes = {};
        this._colorIdxs = {};

        for (const label of labels) {
            this._labels[label.id] = {
                name: label.name,
                attributes: {},
            };

            for (const attr of label.attributes) {
                this._attributes[attr.id] = convertAttribute(attr);
                this._labels[label.id].attributes[attr.id] = this._attributes[attr.id];
            }

            this._colorIdxs[label.id] = +label.id;
        }

        return this;
    }


    labelColorIdx(labelId) {
        return this._colorIdxs[labelId];
    }


    updateLabelColorIdx(labelId) {
        if (labelId in this._colorIdxs) {
            this._colorIdxs[labelId] += 1;
        }
    }


    labels() {
        const labels = {};
        for (const labelId in this._labels) {
            if (Object.prototype.hasOwnProperty.call(this._labels, labelId)) {
                labels[labelId] = this._labels[labelId].name;
            }
        }
        return labels;
    }


    labelAttributes(labelId) {
        if (labelId in this._labels) {
            const attributes = {};
            const labelAttributes = this._labels[labelId].attributes;
            for (const attrId in labelAttributes) {
                if (Object.prototype.hasOwnProperty.call(labelAttributes, attrId)) {
                    attributes[attrId] = labelAttributes[attrId].name;
                }
            }
            return attributes;
        }
        throw Error('Unknown label ID');
    }


    attributes() {
        const attributes = {};
        for (const attrId in this._attributes) {
            if (Object.prototype.hasOwnProperty.call(this._attributes, attrId)) {
                attributes[attrId] = this._attributes[attrId].name;
            }
        }
        return attributes;
    }


    attrInfo(attrId) {
        if (attrId in this._attributes) {
            return JSON.parse(JSON.stringify(this._attributes[attrId]));
        }
        throw Error('Unknown attribute ID');
    }


    labelIdOf(name) {
        for (const labelId in this._labels) {
            if (this._labels[labelId].name === name) {
                return +labelId;
            }
        }
        throw Error('Unknown label name');
    }


    attrIdOf(labelId, name) {
        const attributes = this.labelAttributes(labelId);
        for (const attrId in attributes) {
            if (this._attributes[attrId].name === name) {
                return +attrId;
            }
        }
        throw Error('Unknown attribute name');
    }


    static normalize(type, attrValue) {
        const value = String(attrValue);
        if (type === 'checkbox') {
            return value !== '0' && value.toLowerCase() !== 'false';
        }

        if (type === 'text') {
            return value;
        }

        if (type === 'number') {
            if (Number.isNaN(+value)) {
                throw Error(`Can not convert ${value} to number.`);
            } else {
                return +value;
            }
        }

        return value;
    }


    static serialize(deserialized) {
        let serialized = '';
        for (const label of deserialized) {
            serialized += ` ${label.name}`;
            for (const attr of label.attributes) {
                serialized += ` ${attr.mutable ? '~' : '@'}`;
                serialized += `${attr.input_type}=${attr.name}:`;
                serialized += attr.values.join(',');
            }
        }

        return serialized.trim();
    }


    static deserialize(serialized) {
        const normalized = serialized.replace(/'+/g, '\'').replace(/\s+/g, ' ').trim();
        const fragments = String.customSplit(normalized, ' ');

        const deserialized = [];
        let latest = null;
        for (let fragment of fragments) {
            fragment = fragment.trim();
            if ((fragment.startsWith('~')) || (fragment.startsWith('@'))) {
                const regex = /(@|~)(checkbox|select|number|text|radio)=(.+):(.+)/g;
                const result = regex.exec(fragment);
                if (result === null || latest === null) {
                    throw Error('Bad labels format');
                }

                const values = String.customSplit(result[4], ',');
                latest.attributes.push({
                    name: result[3].replace(/^"/, '').replace(/"$/, ''),
                    mutable: result[1] === '~',
                    input_type: result[2],
                    default_value: values[0].replace(/^"/, '').replace(/"$/, ''),
                    values: values.map(val => val.replace(/^"/, '').replace(/"$/, '')),
                });
            } else {
                latest = {
                    name: fragment.replace(/^"/, '').replace(/"$/, ''),
                    attributes: [],
                };

                deserialized.push(latest);
            }
        }
        return deserialized;
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported AnnotationParser */

/* global
    PolyShapeModel:false
    LabelsInfo:false
*/

class AnnotationParser {
    constructor(job, labelsInfo) {
        this._parser = new DOMParser();
        this._startFrame = job.start;
        this._stopFrame = job.stop;
        this._im_meta = job.image_meta_data;
        this._labelsInfo = labelsInfo;
    }

    _xmlParseError(parsedXML) {
        return parsedXML.getElementsByTagName('parsererror');
    }

    _getBoxPosition(box, frame) {
        frame = Math.min(frame - this._startFrame, this._im_meta.length - 1);
        const imWidth = this._im_meta[frame].width;
        const imHeight = this._im_meta[frame].height;

        let xtl = +box.getAttribute('xtl');
        let ytl = +box.getAttribute('ytl');
        let xbr = +box.getAttribute('xbr');
        let ybr = +box.getAttribute('ybr');

        if (xtl < 0 || ytl < 0 || xbr < 0 || ybr < 0
            || xtl > imWidth || ytl > imHeight || xbr > imWidth || ybr > imHeight) {
            const message = `Incorrect bb found in annotation file: xtl=${xtl} `
            + `ytl=${ytl} xbr=${xbr} ybr=${ybr}. `
            + `Box out of range: ${imWidth}x${imHeight}`;
            throw Error(message);
        }

        const occluded = box.getAttribute('occluded');
        const zOrder = box.getAttribute('z_order') || '0';
        return [[xtl, ytl, xbr, ybr], +occluded, +zOrder];
    }

    _getPolyPosition(shape, frame) {
        frame = Math.min(frame - this._startFrame, this._im_meta.length - 1);
        const imWidth = this._im_meta[frame].width;
        const imHeight = this._im_meta[frame].height;
        let points = shape.getAttribute('points').split(';').join(' ');
        points = PolyShapeModel.convertStringToNumberArray(points);

        for (const point of points) {
            if (point.x < 0 || point.y < 0 || point.x > imWidth || point.y > imHeight) {
                const message = `Incorrect point found in annotation file x=${point.x} `
                    + `y=${point.y}. Point out of range ${imWidth}x${imHeight}`;
                throw Error(message);
            }
        }

        points = points.reduce((acc, el) => {
            acc.push(el.x, el.y);
            return acc;
        }, []);

        const occluded = shape.getAttribute('occluded');
        const zOrder = shape.getAttribute('z_order') || '0';
        return [points, +occluded, +zOrder];
    }

    _getAttribute(labelId, attrTag) {
        const name = attrTag.getAttribute('name');
        const attrId = this._labelsInfo.attrIdOf(labelId, name);
        if (attrId === null) {
            throw Error(`An unknown attribute found in the annotation file: ${name}`);
        }
        const attrInfo = this._labelsInfo.attrInfo(attrId);
        const value = LabelsInfo.normalize(attrInfo.type, attrTag.textContent);

        if (['select', 'radio'].includes(attrInfo.type) && !attrInfo.values.includes(value)) {
            throw Error(`Incorrect attribute value found for "${name}" + attribute: "${value}"`);
        } else if (attrInfo.type === 'number') {
            if (Number.isNaN(+value)) {
                throw Error(`Incorrect attribute value found for "${name}" attribute: "${value}". Value must be a number.`);
            } else {
                const min = +attrInfo.values[0];
                const max = +attrInfo.values[1];
                if (+value < min || +value > max) {
                    throw Error(`Number attribute value out of range for "${name}" attribute: "${value}"`);
                }
            }
        }

        return [attrId, value];
    }

    _getAttributeList(shape, labelId) {
        const attributeDict = {};
        const attributes = shape.getElementsByTagName('attribute');
        for (const attribute of attributes) {
            const [id, value] = this._getAttribute(labelId, attribute);
            attributeDict[id] = value;
        }

        const attributeList = [];
        for (const attrId in attributeDict) {
            if (Object.prototype.hasOwnProperty.call(attributeDict, attrId)) {
                attributeList.push({
                    spec_id: attrId,
                    value: attributeDict[attrId],
                });
            }
        }

        return attributeList;
    }

    _getShapeFromPath(shapeType, tracks) {
        const result = [];
        for (const track of tracks) {
            const label = track.getAttribute('label');
            const group = track.getAttribute('group_id') || '0';
            const labelId = this._labelsInfo.labelIdOf(label);
            if (labelId === null) {
                throw Error(`An unknown label found in the annotation file: ${label}`);
            }

            const shapes = Array.from(track.getElementsByTagName(shapeType));
            shapes.sort((a, b) => +a.getAttribute('frame') - +b.getAttribute('frame'));

            while (shapes.length && +shapes[0].getAttribute('outside')) {
                shapes.shift();
            }

            if (shapes.length === 2) {
                if (shapes[1].getAttribute('frame') - shapes[0].getAttribute('frame') === 1
                    && !+shapes[0].getAttribute('outside') && +shapes[1].getAttribute('outside')) {
                    shapes[0].setAttribute('label', label);
                    shapes[0].setAttribute('group_id', group);
                    result.push(shapes[0]);
                }
            }
        }

        return result;
    }

    _parseAnnotationData(xml) {
        const data = {
            boxes: [],
            polygons: [],
            polylines: [],
            points: [],
        };

        const tracks = xml.getElementsByTagName('track');
        const parsed = {
            box: this._getShapeFromPath('box', tracks),
            polygon: this._getShapeFromPath('polygon', tracks),
            polyline: this._getShapeFromPath('polyline', tracks),
            points: this._getShapeFromPath('points', tracks),
        };
        const shapeTarget = {
            box: 'boxes',
            polygon: 'polygons',
            polyline: 'polylines',
            points: 'points',
        };

        const images = xml.getElementsByTagName('image');
        for (const image of images) {
            const frame = image.getAttribute('id');

            for (const box of image.getElementsByTagName('box')) {
                box.setAttribute('frame', frame);
                parsed.box.push(box);
            }

            for (const polygon of image.getElementsByTagName('polygon')) {
                polygon.setAttribute('frame', frame);
                parsed.polygon.push(polygon);
            }

            for (const polyline of image.getElementsByTagName('polyline')) {
                polyline.setAttribute('frame', frame);
                parsed.polyline.push(polyline);
            }

            for (const points of image.getElementsByTagName('points')) {
                points.setAttribute('frame', frame);
                parsed.points.push(points);
            }
        }

        for (const shapeType in parsed) {
            if (Object.prototype.hasOwnProperty.call(parsed, shapeType)) {
                for (const shape of parsed[shapeType]) {
                    const frame = +shape.getAttribute('frame');
                    if (frame < this._startFrame || frame > this._stopFrame) {
                        continue;
                    }

                    const labelId = this._labelsInfo.labelIdOf(shape.getAttribute('label'));
                    const group = shape.getAttribute('group_id') || '0';
                    if (labelId === null) {
                        throw Error(`An unknown label found in the annotation file: "${shape.getAttribute('label')}"`);
                    }

                    const attributeList = this._getAttributeList(shape, labelId);

                    if (shapeType === 'box') {
                        const [points, occluded, zOrder] = this._getBoxPosition(shape, frame);
                        data[shapeTarget[shapeType]].push({
                            label_id: labelId,
                            group: +group,
                            attributes: attributeList,
                            type: 'rectangle',
                            z_order: zOrder,
                            frame,
                            occluded,
                            points,
                        });
                    } else {
                        const [points, occluded, zOrder] = this._getPolyPosition(shape, frame);
                        data[shapeTarget[shapeType]].push({
                            label_id: labelId,
                            group: +group,
                            attributes: attributeList,
                            type: shapeType,
                            z_order: zOrder,
                            frame,
                            points,
                            occluded,
                        });
                    }
                }
            }
        }

        return data;
    }

    _parseInterpolationData(xml) {
        const data = {
            box_paths: [],
            polygon_paths: [],
            polyline_paths: [],
            points_paths: [],
        };

        const tracks = xml.getElementsByTagName('track');
        for (const track of tracks) {
            const labelId = this._labelsInfo.labelIdOf(track.getAttribute('label'));
            const group = track.getAttribute('group_id') || '0';
            if (labelId === null) {
                throw Error(`An unknown label found in the annotation file: "${track.getAttribute('label')}"`);
            }

            const parsed = {
                box: Array.from(track.getElementsByTagName('box')),
                polygon: Array.from(track.getElementsByTagName('polygon')),
                polyline: Array.from(track.getElementsByTagName('polyline')),
                points: Array.from(track.getElementsByTagName('points')),
            };

            for (const shapeType in parsed) {
                if (Object.prototype.hasOwnProperty.call(parsed, shapeType)) {
                    const shapes = parsed[shapeType];
                    shapes.sort((a, b) => +a.getAttribute('frame') - +b.getAttribute('frame'));

                    while (shapes.length && +shapes[0].getAttribute('outside')) {
                        shapes.shift();
                    }

                    if (shapes.length === 2) {
                        if (shapes[1].getAttribute('frame') - shapes[0].getAttribute('frame') === 1
                            && !+shapes[0].getAttribute('outside') && +shapes[1].getAttribute('outside')) {
                            // pseudo interpolation track (actually is annotation)
                            parsed[shapeType] = [];
                        }
                    }
                }
            }

            let type = null;
            let target = null;
            if (parsed.box.length) {
                type = 'box';
                target = 'box_paths';
            } else if (parsed.polygon.length) {
                type = 'polygon';
                target = 'polygon_paths';
            } else if (parsed.polyline.length) {
                type = 'polyline';
                target = 'polyline_paths';
            } else if (parsed.points.length) {
                type = 'points';
                target = 'points_paths';
            } else {
                continue;
            }

            const path = {
                label_id: labelId,
                group: +group,
                frame: +parsed[type][0].getAttribute('frame'),
                attributes: [],
                shapes: [],
            };

            if (path.frame > this._stopFrame) {
                continue;
            }

            for (const shape of parsed[type]) {
                const keyFrame = +shape.getAttribute('keyframe');
                const outside = +shape.getAttribute('outside');
                const frame = +shape.getAttribute('frame');

                /*
                    All keyframes are significant.
                    All shapes on first segment frame also significant.
                    Ignore all frames less then start.
                    Ignore all frames more then stop.
                */
                const significant = (keyFrame || frame === this._startFrame)
                    && frame >= this._startFrame && frame <= this._stopFrame;

                if (significant) {
                    const attributeList = this._getAttributeList(shape, labelId);
                    const shapeAttributes = [];
                    const pathAttributes = [];

                    for (const attr of attributeList) {
                        const attrInfo = this._labelsInfo.attrInfo(attr.spec_id);
                        if (attrInfo.mutable) {
                            shapeAttributes.push({
                                spec_id: attr.spec_id,
                                value: attr.value,
                            });
                        } else {
                            pathAttributes.push({
                                spec_id: attr.spec_id,
                                value: attr.value,
                            });
                        }
                    }
                    path.attributes = pathAttributes;

                    if (type === 'box') {
                        const [points, occluded, zOrder] = this._getBoxPosition(shape,
                            Math.clamp(frame, this._startFrame, this._stopFrame));
                        path.shapes.push({
                            attributes: shapeAttributes,
                            type: 'rectangle',
                            frame,
                            occluded,
                            outside,
                            points,
                            zOrder,
                        });
                    } else {
                        const [points, occluded, zOrder] = this._getPolyPosition(shape,
                            Math.clamp(frame, this._startFrame, this._stopFrame));
                        path.shapes.push({
                            attributes: shapeAttributes,
                            type,
                            frame,
                            occluded,
                            outside,
                            points,
                            zOrder,
                        });
                    }
                }
            }

            if (path.shapes.length) {
                data[target].push(path);
            }
        }

        return data;
    }

    parse(text) {
        const xml = this._parser.parseFromString(text, 'text/xml');
        const parseerror = this._xmlParseError(xml);
        if (parseerror.length) {
            throw Error(`Annotation page parsing error. ${parseerror[0].innerText}`);
        }

        const interpolationData = this._parseInterpolationData(xml);
        const annotationData = this._parseAnnotationData(xml);

        const data = {
            shapes: [],
            tracks: [],
        };


        for (const type in interpolationData) {
            if (Object.prototype.hasOwnProperty.call(interpolationData, type)) {
                Array.prototype.push.apply(data.tracks, interpolationData[type]);
            }
        }

        for (const type in annotationData) {
            if (Object.prototype.hasOwnProperty.call(annotationData, type)) {
                Array.prototype.push.apply(data.shapes, annotationData[type]);
            }
        }

        return data;
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported AAMModel AAMController AAMView AAMUndefinedKeyword */

/* global
    Listener:false
    Logger:false
    Mousetrap:false
    PolyShapeModel:false
    SVG:false
*/

const AAMUndefinedKeyword = '__undefined__';

class AAMModel extends Listener {
    constructor(shapeCollection, focus, fit) {
        super('onAAMUpdate', () => this);
        this._shapeCollection = shapeCollection;
        this._focus = focus;
        this._fit = fit;
        this._activeAAM = false;
        this._activeIdx = null;
        this._active = null;
        this._margin = 100;
        this._currentShapes = [];
        this._attrNumberByLabel = {};
        this._helps = {};

        function getHelp(attrId) {
            const attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
            const help = [];
            switch (attrInfo.type) {
            case 'checkbox':
                help.push(`0 - ${attrInfo.values[0]}`);
                help.push(`1 - ${!attrInfo.values[0]}`);
                break;
            default:
                for (let idx = 0; idx < attrInfo.values.length; idx += 1) {
                    if (idx > 9) {
                        break;
                    }
                    if (attrInfo.values[0] === AAMUndefinedKeyword) {
                        if (!idx) {
                            continue;
                        }
                        help.push(`${idx - 1} - ${attrInfo.values[idx]}`);
                    } else {
                        help.push(`${idx} - ${attrInfo.values[idx]}`);
                    }
                }
            }

            return help;
        }

        const labels = window.cvat.labelsInfo.labels();
        for (const labelId in labels) {
            if (Object.prototype.hasOwnProperty.call(labels, labelId)) {
                const labelAttributes = window.cvat.labelsInfo.labelAttributes(labelId);
                if (Object.keys(labelAttributes).length) {
                    this._attrNumberByLabel[labelId] = {
                        current: 0,
                        end: Object.keys(labelAttributes).length,
                    };

                    for (const attrId in labelAttributes) {
                        if (Object.prototype.hasOwnProperty.call(labelAttributes, attrId)) {
                            this._helps[attrId] = {
                                title: `${window.cvat.labelsInfo.labels()[labelId]}, ${window.cvat.labelsInfo.attributes()[attrId]}`,
                                help: getHelp(attrId),
                            };
                        }
                    }
                }
            }
        }

        shapeCollection.subscribe(this);
    }

    _bbRect(pos) {
        if ('points' in pos) {
            const points = PolyShapeModel.convertStringToNumberArray(pos.points);
            let xtl = Number.MAX_SAFE_INTEGER;
            let ytl = Number.MAX_SAFE_INTEGER;
            let xbr = Number.MIN_SAFE_INTEGER;
            let ybr = Number.MIN_SAFE_INTEGER;
            for (const point of points) {
                xtl = Math.min(xtl, point.x);
                ytl = Math.min(ytl, point.y);
                xbr = Math.max(xbr, point.x);
                ybr = Math.max(ybr, point.y);
            }
            return [xtl, ytl, xbr, ybr];
        }
        return [pos.xtl, pos.ytl, pos.xbr, pos.ybr];
    }

    _updateCollection() {
        this._currentShapes = [];

        for (const shape of this._shapeCollection.currentShapes) {
            const labelAttributes = window.cvat.labelsInfo.labelAttributes(shape.model.label);
            if (Object.keys(labelAttributes).length
                && !shape.model.removed && !shape.interpolation.position.outside) {
                this._currentShapes.push({
                    model: shape.model,
                    interpolation: shape.model.interpolate(window.cvat.player.frames.current),
                });
            }
        }

        if (this._currentShapes.length) {
            this._activeIdx = 0;
            this._active = this._currentShapes[0].model;
        } else {
            this._activeIdx = null;
            this._active = null;
        }
    }

    _attrIdByIdx(labelId, attrIdx) {
        return Object.keys(window.cvat.labelsInfo.labelAttributes(labelId))[attrIdx];
    }

    _activate() {
        if (this._activeAAM && this._active) {
            const { label } = this._active;


            const [xtl, ytl, xbr, ybr] = this._bbRect(this._currentShapes[this._activeIdx]
                .interpolation.position);
            this._focus(xtl - this._margin, xbr + this._margin,
                ytl - this._margin, ybr + this._margin);
            this.notify();

            if (typeof (this._attrNumberByLabel[label]) !== 'undefined') {
                const attrId = +this._attrIdByIdx(label, this._attrNumberByLabel[label].current);
                this._active.activeAttribute = attrId;
            }
        } else {
            this.notify();
        }
    }

    _deactivate() {
        if (this._activeAAM && this._active) {
            this._active.activeAttribute = null;
        }
    }

    _enable() {
        if (window.cvat.mode === null) {
            window.cvat.mode = 'aam';
            this._shapeCollection.resetActive();
            this._activeAAM = true;
            this._updateCollection();
            this._activate();
        }
    }

    _disable() {
        if (this._activeAAM && window.cvat.mode === 'aam') {
            this._deactivate();
            window.cvat.mode = null;
            this._activeAAM = false;
            this._activeIdx = null;
            this._active = null;

            // Notify for remove aam UI
            this.notify();
            this._fit();
        }
    }

    switchAAMMode() {
        if (this._activeAAM) {
            this._disable();
        } else {
            this._enable();
        }
    }

    moveShape(direction) {
        if (!this._activeAAM || this._currentShapes.length < 2) {
            return;
        }

        this._deactivate();
        if (Math.sign(direction) < 0) {
            // next
            this._activeIdx += 1;
            if (this._activeIdx >= this._currentShapes.length) {
                this._activeIdx = 0;
            }
        } else {
            // prev
            this._activeIdx -= 1;
            if (this._activeIdx < 0) {
                this._activeIdx = this._currentShapes.length - 1;
            }
        }

        this._active = this._currentShapes[this._activeIdx].model;
        this._activate();
    }

    moveAttr(direction) {
        if (!this._activeAAM || !this._active) {
            return;
        }

        const curAttr = this._attrNumberByLabel[this._active.label];
        if (typeof (curAttr) === 'undefined') {
            return;
        }

        if (curAttr.end < 2) {
            return;
        }

        if (Math.sign(direction) > 0) {
            // next
            curAttr.current += 1;
            if (curAttr.current >= curAttr.end) {
                curAttr.current = 0;
            }
        } else {
            // prev
            curAttr.current -= 1;
            if (curAttr.current < 0) {
                curAttr.current = curAttr.end - 1;
            }
        }
        this._activate();
    }

    setupAttributeValue(key) {
        if (!this._activeAAM || !this._active) {
            return;
        }
        const { label } = this._active;
        const frame = window.cvat.player.frames.current;
        if (typeof (this._attrNumberByLabel[label]) === 'undefined') {
            return;
        }

        const attrId = this._attrIdByIdx(label, this._attrNumberByLabel[label].current);
        const attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
        if (key >= attrInfo.values.length) {
            if (attrInfo.type === 'checkbox' && key < 2) {
                this._active.updateAttribute(frame, attrId, !attrInfo.values[0]);
            }
            return;
        }
        if (attrInfo.values[0] === AAMUndefinedKeyword) {
            if (key >= attrInfo.values.length - 1) {
                return;
            }
            key += 1;
        }
        this._active.updateAttribute(frame, attrId, attrInfo.values[key]);
    }

    onCollectionUpdate() {
        if (this._activeAAM) {
            // No need deactivate active view because all listeners already unsubscribed
            this._updateCollection();
            this._activate();
        }
    }

    generateHelps() {
        if (this._active) {
            const { label } = this._active;
            if (typeof (this._attrNumberByLabel[label]) !== 'undefined') {
                const attrId = +this._attrIdByIdx(label, this._attrNumberByLabel[label].current);
                return [this._helps[attrId].title, this._helps[attrId].help, `${this._activeIdx + 1}/${this._currentShapes.length}`];
            }
            return ['No Attributes Found', '', `${this._activeIdx + 1}/${this._currentShapes.length}`];
        }
        return ['No Shapes Found', '', '0/0'];
    }

    get activeAAM() {
        return this._activeAAM;
    }

    get active() {
        return this._active;
    }

    set margin(value) {
        this._margin = value;
    }
}


class AAMController {
    constructor(aamModel) {
        this._model = aamModel;

        function setupAAMShortkeys() {
            const switchAAMHandler = Logger.shortkeyLogDecorator(() => {
                this._model.switchAAMMode();
            });

            const nextAttributeHandler = Logger.shortkeyLogDecorator((e) => {
                this._model.moveAttr(1);
                e.preventDefault();
            });

            const prevAttributeHandler = Logger.shortkeyLogDecorator((e) => {
                this._model.moveAttr(-1);
                e.preventDefault();
            });

            const nextShapeHandler = Logger.shortkeyLogDecorator((e) => {
                this._model.moveShape(1);
                e.preventDefault();
            });

            const prevShapeHandler = Logger.shortkeyLogDecorator((e) => {
                this._model.moveShape(-1);
                e.preventDefault();
            });

            const selectAttributeHandler = Logger.shortkeyLogDecorator((e) => {
                let key = e.keyCode;
                if (key >= 48 && key <= 57) {
                    key -= 48; // 0 and 9
                } else if (key >= 96 && key <= 105) {
                    key -= 96; // num 0 and 9
                } else {
                    return;
                }
                this._model.setupAttributeValue(key);
            });

            const { shortkeys } = window.cvat.config;
            Mousetrap.bind(shortkeys.switch_aam_mode.value, switchAAMHandler, 'keydown');
            Mousetrap.bind(shortkeys.aam_next_attribute.value, nextAttributeHandler, 'keydown');
            Mousetrap.bind(shortkeys.aam_prev_attribute.value, prevAttributeHandler, 'keydown');
            Mousetrap.bind(shortkeys.aam_next_shape.value, nextShapeHandler, 'keydown');
            Mousetrap.bind(shortkeys.aam_prev_shape.value, prevShapeHandler, 'keydown');
            Mousetrap.bind(shortkeys.select_i_attribute.value, selectAttributeHandler, 'keydown');
        }

        setupAAMShortkeys.call(this);
    }

    setMargin(value) {
        this._model.margin = value;
    }
}


class AAMView {
    constructor(aamModel, aamController) {
        this._trackManagement = $('#trackManagement');
        this._aamMenu = $('#aamMenu');
        this._aamTitle = $('#aamTitle');
        this._aamCounter = $('#aamCounter');
        this._aamHelpContainer = $('#aamHelpContainer');
        this._zoomMargin = $('#aamZoomMargin');
        this._frameContent = SVG.adopt($('#frameContent')[0]);
        this._controller = aamController;

        this._zoomMargin.on('change', (e) => {
            const value = +e.target.value;
            this._controller.setMargin(value);
        }).trigger('change');
        aamModel.subscribe(this);
    }

    _setupAAMView(active, type, pos) {
        const oldRect = $('#outsideRect');
        const oldMask = $('#outsideMask');

        if (active) {
            if (oldRect.length) {
                oldRect.remove();
                oldMask.remove();
            }

            const size = window.cvat.translate.box.actualToCanvas({
                x: 0,
                y: 0,
                width: window.cvat.player.geometry.frameWidth,
                height: window.cvat.player.geometry.frameHeight,
            });

            const excludeField = this._frameContent.rect(size.width, size.height).move(size.x, size.y).fill('#666');
            let includeField = null;

            if (type === 'box') {
                pos = window.cvat.translate.box.actualToCanvas(pos);
                includeField = this._frameContent.rect(pos.xbr - pos.xtl,
                    pos.ybr - pos.ytl).move(pos.xtl, pos.ytl);
            } else {
                pos.points = window.cvat.translate.points.actualToCanvas(pos.points);
                includeField = this._frameContent.polygon(pos.points);
            }

            this._frameContent.mask().add(excludeField)
                .add(includeField).fill('black')
                .attr('id', 'outsideMask');
            this._frameContent.rect(size.width, size.height)
                .move(size.x, size.y).attr({
                    mask: 'url(#outsideMask)',
                    id: 'outsideRect',
                });

            const content = $(this._frameContent.node);
            const texts = content.find('.shapeText');
            for (const text of texts) {
                content.append(text);
            }
        } else {
            oldRect.remove();
            oldMask.remove();
        }
    }

    onAAMUpdate(aam) {
        this._setupAAMView(Boolean(aam.active),
            aam.active ? aam.active.type.split('_')[1] : '',
            aam.active ? aam.active.interpolate(window.cvat.player.frames.current).position : 0);

        if (aam.activeAAM) {
            if (this._aamMenu.hasClass('hidden')) {
                this._trackManagement.addClass('hidden');
                this._aamMenu.removeClass('hidden');
            }

            const [title, help, counter] = aam.generateHelps();
            this._aamHelpContainer.empty();
            this._aamCounter.text(counter);
            this._aamTitle.text(title);

            for (const helpRow of help) {
                $(`<label> ${helpRow} <label> <br>`).appendTo(this._aamHelpContainer);
            }
        } else if (this._trackManagement.hasClass('hidden')) {
            this._aamMenu.addClass('hidden');
            this._trackManagement.removeClass('hidden');
        }
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported FilterModel FilterController FilterView */
/* eslint no-unused-vars: ["error", { "caughtErrors": "none" }] */

/* global
    defiant:false
*/

class FilterModel {
    constructor(update) {
        this._regex = /^[0-9]+|[-,?!()\s]+/g;
        this._filter = '';
        this._update = update;
        this._labels = window.cvat.labelsInfo.labels();
        this._attributes = window.cvat.labelsInfo.attributes();
    }

    _convertShape(shape) {
        // We replace all special characters due to defiant.js can't work with them
        function convertAttributes(attributes) {
            const convertedAttributes = {};
            for (const attrId in attributes) {
                if (Object.prototype.hasOwnProperty.call(attributes, attrId)) {
                    const key = attributes[attrId].name
                        .toLowerCase().replace(this._regex, '_');
                    convertedAttributes[key] = String(attributes[attrId].value)
                        .toLowerCase();
                }
            }
            return convertedAttributes;
        }

        const converted = {
            id: shape.model.id,
            serverid: shape.model.serverID,
            label: shape.model.label,
            type: shape.model.type.split('_')[1],
            mode: shape.model.type.split('_')[0],
            occluded: Boolean(shape.interpolation.position.occluded),
            attr: convertAttributes.call(this, shape.interpolation.attributes),
            lock: shape.model.lock,
        };

        if (shape.model.type.split('_')[1] === 'box') {
            converted.width = shape.interpolation.position.xbr - shape.interpolation.position.xtl;
            converted.height = shape.interpolation.position.ybr - shape.interpolation.position.ytl;
        } else {
            converted.width = shape.interpolation.position.width;
            converted.height = shape.interpolation.position.height;
        }

        return converted;
    }

    _convertCollection(collection) {
        const converted = {};
        for (const labelId in this._labels) {
            if (Object.prototype.hasOwnProperty.call(this._labels, labelId)) {
                converted[this._labels[labelId].toLowerCase().replace(this._regex, '_')] = [];
            }
        }

        for (const shape of collection) {
            converted[this._labels[shape.model.label]
                .toLowerCase().replace(this._regex, '_')]
                .push(this._convertShape.call(this, shape));
        }
        return converted;
    }

    filter(interpolation) {
        if (this._filter.length) {
            // Get shape indexes
            try {
                const idxs = defiant.search(this._convertCollection(interpolation), `(${this._filter})/id`);
                return interpolation.filter(x => idxs.indexOf(x.model.id) !== -1);
            } catch (ignore) {
                return [];
            }
        } else {
            return interpolation;
        }
    }

    updateFilter(value, silent) {
        this._filter = value;
        if (!silent) {
            this._update();
        }
    }

    get regex() {
        return this._regex;
    }
}

class FilterController {
    constructor(filterModel) {
        this._model = filterModel;
    }

    updateFilter(value, silent) {
        if (!value.length) {
            this._model.updateFilter('', silent);
            return true;
        }

        try {
            value = value.toLowerCase();

            const labels = String.customSplit(value, '[|]').map(el => el.trim());
            let result = '';
            for (const label of labels) {
                const labelName = label.match(/^[-,?!_0-9a-z()*\s"]+/)[0];
                const labelFilters = label.substr(labelName.length).trim();

                result += `${labelName.replace(this._model.regex, '_').replace(/"/g, '')}`;

                const orExpressions = String.customSplit(labelFilters, 'or').map(el => el.trim());
                const formattedOrExpressions = [];
                for (const orExpression of orExpressions) {
                    const andExpressions = String.customSplit(orExpression, 'and').map(el => el.trim());
                    const formattedAndExpressions = [];
                    for (const andExpression of andExpressions) {
                        if (andExpression.includes('attr/')) {
                            const attrMatch = andExpression.match(/[\\[(]*attr\//);
                            const attrPrefix = attrMatch[0];
                            const attrExpression = andExpression.substr(attrMatch.index
                                + attrPrefix.length);
                            const [attrName, attrValue] = String
                                .customSplit(attrExpression, '=|<=|>=|<|>|!=');
                            const condition = attrExpression
                                .slice(attrName.length, -attrValue.length).trim();

                            formattedAndExpressions
                                .push(`${attrPrefix}${attrName.trim().replace(this._model.regex, '_')
                                    .replace(/"/g, '')}${condition}${attrValue.trim()}`);
                        } else {
                            formattedAndExpressions.push(andExpression);
                        }
                    }

                    if (formattedAndExpressions.length > 1) {
                        formattedOrExpressions.push(formattedAndExpressions.join(' and '));
                    } else {
                        formattedOrExpressions.push(formattedAndExpressions[0]);
                    }
                }

                if (formattedOrExpressions.length > 1) {
                    result += `${formattedOrExpressions.join(' or ')}`;
                } else {
                    result += `${formattedOrExpressions[0]}`;
                }

                result += '|';
            }

            result = result.substr(0, result.length - 1);
            result = result.split('|').map(x => `/d:data/${x}`).join('|');

            document.evaluate(result, document, () => 'ns');

            this._model.updateFilter(result, silent);
        } catch (ignore) {
            return false;
        }

        return true;
    }

    deactivate() {
        this._model.active = false;
    }
}


class FilterView {
    constructor(filterController) {
        this._controller = filterController;
        this._filterString = $("#filterInputString");
        this._resetFilterButton = $("#resetFilterButton");
        this._filterString.on("keypress keydown keyup", (e) => e.stopPropagation());
        this._filterSubmitList = $("#filterSubmitList");

        let predefinedValues = null;
        try {
            predefinedValues = JSON.parse(localStorage.getItem("filterValues")) || [];
        }
        catch (ignore) {
            predefinedValues = [];
        }

        let initSubmitList = () => {
            this._filterSubmitList.empty();
            for (let value of predefinedValues) {
                value = value.replace(/'/g, '"');
                this._filterSubmitList.append(`<option value='${value}'> ${value} </option>`);
            }
        }
        initSubmitList();

        this._filterString.on("change", (e) => {
            let value = $.trim(e.target.value).replace(/'/g, '"');
            if (this._controller.updateFilter(value, false)) {
                this._filterString.css("color", "green");
                if (!predefinedValues.includes(value)) {
                    predefinedValues = (predefinedValues.concat([value])).slice(-10);
                    localStorage.setItem("filterValues", JSON.stringify(predefinedValues));
                    initSubmitList();
                }
            }
            else {
                this._filterString.css("color", "red");
                this._controller.updateFilter("", false);
            }
        });

        let shortkeys = window.cvat.config.shortkeys;
        this._filterString.attr("title", `
            ${shortkeys["prev_filter_frame"].view_value} - ${shortkeys["prev_filter_frame"].description}` + `\n` +
            `${shortkeys["next_filter_frame"].view_value} - ${shortkeys["next_filter_frame"].description}`);

        this._resetFilterButton.on("click", () => {
            this._filterString.prop("value", "");
            this._controller.updateFilter("", false);
        });

        let initialFilter = window.cvat.search.get("filter");
        if (initialFilter) {
            this._filterString.prop("value", initialFilter);
            if (this._controller.updateFilter(initialFilter, true)) {
                this._filterString.css("color", "green");
            }
            else {
                this._filterString.prop("value", "");
                this._filterString.css("color", "red");
            }
        }
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeSplitter */
"use strict";

class ShapeSplitter {
    _convertMutableAttributes(attributes) {
        const result = [];
        for (const attrId in attributes) {
            if (Object.prototype.hasOwnProperty.call(attributes, attrId)) {
                const attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
                if (attrInfo.mutable) {
                    result.push({
                        id: +attrId,
                        value: attributes[attrId].value,
                    });
                }
            }
        }

        return result;
    }

    split(track, frame) {
        const keyFrames = track.keyframes.map(keyframe => +keyframe).sort((a, b) => a - b);
        const exported = track.export();

        if (frame > +keyFrames[0]) {
            const curInterpolation = track.interpolate(frame);
            const prevInterpolation = track.interpolate(frame - 1);
            const curAttributes = this._convertMutableAttributes(curInterpolation.attributes);
            const prevAttrributes = this._convertMutableAttributes(prevInterpolation.attributes);
            const curPositionList = [];
            const prevPositionList = [];

            for (const shape of exported.shapes) {
                if (shape.frame < frame - 1) {
                    prevPositionList.push(shape);
                } else if (shape.frame > frame) {
                    curPositionList.push(shape);
                }
            }

            if (track.type.split('_')[1] === 'box') {
                const prevPos = prevInterpolation.position;
                prevPositionList.push(Object.assign({}, {
                    frame: frame - 1,
                    attributes: prevAttrributes,
                    type: 'box',
                }, prevPos));

                const curPos = curInterpolation.position;
                prevPositionList.push(Object.assign({}, {
                    frame,
                    attributes: curAttributes,
                    type: 'box',
                }, curPos, { outside: true }));

                curPositionList.push(Object.assign({}, {
                    frame,
                    attributes: curAttributes,
                    type: 'box',
                }, curPos));
            } else {
                const curPos = curInterpolation.position;
                curPositionList.push(Object.assign({
                    frame,
                    attributes: curAttributes,
                    type: track.type.split('_')[1],
                }, curPos));
            }

            // don't clone id of splitted object
            delete exported.id;
            // don't clone group of splitted object
            delete exported.group;

            const prevExported = JSON.parse(JSON.stringify(exported));
            const curExported = JSON.parse(JSON.stringify(exported));
            prevExported.shapes = prevPositionList;
            curExported.shapes = curPositionList;
            curExported.frame = frame;
            return [prevExported, curExported];
        }
        return [exported];
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported PolyshapeEditorModel PolyshapeEditorController PolyshapeEditorView */

/* global
    Listener:false
    POINT_RADIUS:false
    PolyShapeModel:false
    STROKE_WIDTH:false
    SVG:false
    BorderSticker:false
*/

"use strict";

class PolyshapeEditorModel extends Listener {
    constructor(shapeCollection) {
        super("onPolyshapeEditorUpdate", () => this);

        this._modeName = 'poly_editing';
        this._active = false;
        this._shapeCollection = shapeCollection;
        this._data = {
            points: null,
            color: null,
            start: null,
            oncomplete: null,
            type: null,
            event: null,
            startPoint: null,
            id: null,
        };
    }

    edit(type, points, color, start, startPoint, e, oncomplete, id) {
        if (!this._active && !window.cvat.mode) {
            window.cvat.mode = this._modeName;
            this._active = true;
            this._data.points = points;
            this._data.color = color;
            this._data.start = start;
            this._data.oncomplete = oncomplete;
            this._data.type = type;
            this._data.event = e;
            this._data.startPoint = startPoint;
            this._data.id = id;
            this.notify();
        }
        else if (this._active) {
            throw Error('Polyshape has been being edited already');
        }
    }

    finish(points) {
        if (this._active && this._data.oncomplete) {
            this._data.oncomplete(points);
        }

        this.cancel();
    }

    cancel() {
        if (this._active) {
            this._active = false;
            if (window.cvat.mode != this._modeName) {
                throw Error(`Inconsistent behaviour has been detected. Edit mode is activated, but mode variable is '${window.cvat.mode}'`);
            }
            else {
                window.cvat.mode = null;
            }

            this._data.points = null;
            this._data.color = null;
            this._data.start = null;
            this._data.oncomplete = null;
            this._data.type = null;
            this._data.event = null;
            this._data.startPoint = null;
            this.notify();
        }
    }

    get active() {
        return this._active;
    }

    get data() {
        return this._data;
    }

    get currentShapes() {
        this._shapeCollection.update();
        return this._shapeCollection.currentShapes;
    }
}


class PolyshapeEditorController {
    constructor(model) {
        this._model = model;
    }

    finish(points) {
        this._model.finish(points);
    }

    cancel() {
        this._model.cancel();
    }

    get currentShapes() {
        return this._model.currentShapes;
    }
}


class PolyshapeEditorView {
    constructor(model, controller) {
        this._controller = controller;
        this._data = null;

        this._frameContent = SVG.adopt($('#frameContent')[0]);
        this._commonBordersCheckbox = $('#commonBordersCheckbox');
        this._originalShapePointsGroup = null;
        this._originalShapePoints = [];
        this._originalShape = null;
        this._correctLine = null;
        this._borderSticker = null;

        this._scale = window.cvat.player.geometry.scale;
        this._frame = window.cvat.player.frames.current;

        this._commonBordersCheckbox.on('change.shapeEditor', (e) => {
            if (this._correctLine) {
                if (!e.target.checked) {
                    if (this._borderSticker) {
                        this._borderSticker.disable();
                        this._borderSticker = null;
                    }
                } else {
                    this._borderSticker = new BorderSticker(this._correctLine, this._frameContent,
                        this._controller.currentShapes
                            .filter((shape) => shape.model.id !== this._data.id),
                        this._scale);
                }
            }
        });

        model.subscribe(this);
    }

    _rescaleDrawPoints() {
        let scale = this._scale;
        $('.svg_draw_point').each(function() {
            this.instance.radius(POINT_RADIUS / (2 * scale)).attr('stroke-width', STROKE_WIDTH / (2 * scale));
        });
    }

    // After this method start element will be in begin of the array.
    // Array will consist only range elements from start to stop
    _resortPoints(points, start, stop) {
        let sorted = [];

        if (points.indexOf(start) === -1 || points.indexOf(stop) === -1) {
            throw Error('Point array must consist both start and stop elements');
        }

        let idx = points.indexOf(start) + 1;
        let condition = true;  // constant condition is eslint error
        while (condition) {
            if (idx >= points.length) idx = 0;
            if (points[idx] === stop) condition = false;
            else sorted.push(points[idx++]);
        }

        return sorted;
    }

    // Method represents array like circle list and find shortest way from source to target
    // It returns integer number - distance from source to target.
    // It can be negative if shortest way is anti clockwise
    _findMinCircleDistance(array, source, target) {
        let clockwise_distance = 0;
        let anti_clockwise_distance = 0;

        let source_idx = array.indexOf(source);
        let target_idx = array.indexOf(target);

        if (source_idx === -1 || target_idx == -1) {
            throw Error('Array should consist both elements');
        }

        let idx = source_idx;
        while (array[idx++] != target) {
            clockwise_distance ++;
            if (idx >= array.length) idx = 0;
        }

        idx = source_idx;
        while (array[idx--] != target) {
            anti_clockwise_distance ++;
            if (idx < 0) idx = array.length - 1;
        }

        let offset = Math.min(clockwise_distance, anti_clockwise_distance);
        if (anti_clockwise_distance < clockwise_distance) {
            offset = -offset;
        }

        return offset;
    }

    _addRawPoint(x, y) {
        this._correctLine.array().valueOf().pop();
        this._correctLine.array().valueOf().push([x, y]);
        // not error, specific of the library
        this._correctLine.array().valueOf().push([x, y]);
        this._correctLine.remember('_paintHandler').drawCircles();
        this._correctLine.plot(this._correctLine.array().valueOf());
        this._rescaleDrawPoints();
    }

    _startEdit() {
        this._frame = window.cvat.player.frames.current;
        let strokeWidth = this._data.type === 'points' ? 0 : STROKE_WIDTH / this._scale;

        // Draw copy of original shape
        if (this._data.type === 'polygon') {
            this._originalShape = this._frameContent.polygon(this._data.points);
        }
        else {
            this._originalShape = this._frameContent.polyline(this._data.points);
        }

        this._originalShape.attr({
            'stroke-width': strokeWidth,
            'stroke': 'white',
            'fill': 'none',
        });

        // Create the correct line
        this._correctLine = this._frameContent.polyline().draw({snapToGrid: 0.1}).attr({
            'stroke-width': strokeWidth / 2,
            'fill': 'none',
            'stroke': 'red',
        }).on('mouseover', () => false);


        // Add points to original shape
        let pointRadius = POINT_RADIUS / this._scale;
        this._originalShapePointsGroup = this._frameContent.group();
        for (let point of PolyShapeModel.convertStringToNumberArray(this._data.points)) {
            let uiPoint = this._originalShapePointsGroup.circle(pointRadius * 2)
                .move(point.x - pointRadius, point.y - pointRadius)
                .attr({
                    'stroke-width': strokeWidth,
                    'stroke': 'black',
                    'fill': 'white',
                    'z_order': Number.MAX_SAFE_INTEGER,
                });
            this._originalShapePoints.push(uiPoint);
        }


        const [x, y] = this._data.startPoint
            .split(',').map((el) => +el);
        let prevPoint = {
            x,
            y,
        };

        // draw and remove initial point just to initialize data structures
        this._correctLine.draw('point', this._data.event);
        this._correctLine.draw('undo');

        this._addRawPoint(x, y);

        this._frameContent.on('mousemove.polyshapeEditor', (e) => {
            if (e.shiftKey && this._data.type !== 'points') {
                const delta = Math.sqrt(Math.pow(e.clientX - prevPoint.x, 2)
                    + Math.pow(e.clientY - prevPoint.y, 2));
                const deltaTreshold = 15;
                if (delta > deltaTreshold) {
                    this._correctLine.draw('point', e);
                    prevPoint = {
                        x: e.clientX,
                        y: e.clientY
                    };
                }
            }
        });

        this._frameContent.on('contextmenu.polyshapeEditor', (e) => {
            if (PolyShapeModel.convertStringToNumberArray(this._correctLine.attr('points')).length > 2) {
                this._correctLine.draw('undo');
                if (this._borderSticker) {
                    this._borderSticker.reset();
                }
            } else {
                // Finish without points argument is just cancel
                this._controller.finish();
            }
            e.preventDefault();
            e.stopPropagation();
        });

        this._correctLine.on('drawpoint', (e) => {
            prevPoint = {
                x: e.detail.event.clientX,
                y: e.detail.event.clientY
            };

            this._rescaleDrawPoints();
            if (this._borderSticker) {
                this._borderSticker.reset();
            }
        });

        this._correctLine.on('drawstart', () => this._rescaleDrawPoints());


        for (let instance of this._originalShapePoints) {
            instance.on('mouseover', () => {
                instance.attr('stroke-width', STROKE_WIDTH * 2 / this._scale);
            }).on('mouseout', () => {
                instance.attr('stroke-width', STROKE_WIDTH / this._scale);
            }).on('mousedown', (e) => {
                if (e.which !== 1) {
                    return;
                }
                let currentPoints = PolyShapeModel.convertStringToNumberArray(this._data.points);
                // replace the latest point from the event
                // (which has not precise coordinates, to precise coordinates)
                let correctPoints = this._correctLine
                    .attr('points')
                    .split(/\s/)
                    .slice(0, -1);
                correctPoints = correctPoints.concat([`${instance.attr('cx')},${instance.attr('cy')}`]).join(' ');
                correctPoints = PolyShapeModel.convertStringToNumberArray(correctPoints);

                let resultPoints = [];

                if (this._data.type === 'polygon') {
                    let startPtIdx = this._data.start;
                    let stopPtIdx = $(instance.node).index();
                    let offset = this._findMinCircleDistance(currentPoints, currentPoints[startPtIdx], currentPoints[stopPtIdx]);

                    if (!offset) {
                        currentPoints = this._resortPoints(currentPoints, currentPoints[startPtIdx], currentPoints[stopPtIdx]);
                        resultPoints.push(...correctPoints.slice(0, -2));
                        resultPoints.push(...currentPoints);
                    }
                    else {
                        resultPoints.push(...correctPoints);
                        if (offset < 0) {
                            resultPoints = resultPoints.reverse();
                            currentPoints = this._resortPoints(currentPoints, currentPoints[startPtIdx], currentPoints[stopPtIdx]);
                        }
                        else {
                            currentPoints = this._resortPoints(currentPoints, currentPoints[stopPtIdx], currentPoints[startPtIdx]);
                        }

                        resultPoints.push(...currentPoints);
                    }
                }
                else if (this._data.type === 'polyline') {
                    let startPtIdx = this._data.start;
                    let stopPtIdx = $(instance.node).index();

                    if (startPtIdx === stopPtIdx) {
                        resultPoints.push(...correctPoints.slice(1, -1).reverse());
                        resultPoints.push(...currentPoints);
                    }
                    else {
                        if (startPtIdx > stopPtIdx) {
                            if (startPtIdx < currentPoints.length - 1) {
                                resultPoints.push(...currentPoints.slice(startPtIdx + 1).reverse());
                            }
                            resultPoints.push(...correctPoints.slice(0, -1));
                            if (stopPtIdx > 0) {
                                resultPoints.push(...currentPoints.slice(0, stopPtIdx).reverse());
                            }
                        }
                        else {
                            if (startPtIdx > 0) {
                                resultPoints.push(...currentPoints.slice(0, startPtIdx));
                            }
                            resultPoints.push(...correctPoints.slice(0, -1));
                            if (stopPtIdx < currentPoints.length) {
                                resultPoints.push(...currentPoints.slice(stopPtIdx + 1));
                            }
                        }
                    }
                }
                else {
                    resultPoints.push(...currentPoints);
                    resultPoints.push(...correctPoints.slice(1, -1).reverse());
                }

                this._correctLine.draw('cancel');
                this._controller.finish(PolyShapeModel.convertNumberArrayToString(resultPoints));
            });
        }

        this._commonBordersCheckbox.css('display', '').trigger('change.shapeEditor');
        this._commonBordersCheckbox.parent().css('display', '');
        $('body').on('keydown.shapeEditor', (e) => {
            if (e.ctrlKey && e.keyCode === 17) {
                this._commonBordersCheckbox.prop('checked', !this._borderSticker);
                this._commonBordersCheckbox.trigger('change.shapeEditor');
            }
        });
    }

    _endEdit() {
        for (let uiPoint of this._originalShapePoints) {
            uiPoint.off();
            uiPoint.remove();
        }

        this._originalShapePoints = [];
        this._originalShapePointsGroup.remove();
        this._originalShapePointsGroup = null;
        this._originalShape.remove();
        this._originalShape = null;
        this._correctLine.off('drawstart');
        this._correctLine.off('drawpoint');
        this._correctLine.draw('cancel');
        this._correctLine.remove();
        this._correctLine = null;
        this._data = null;

        this._frameContent.off('mousemove.polyshapeEditor');
        this._frameContent.off('mousedown.polyshapeEditor');
        this._frameContent.off('contextmenu.polyshapeEditor');

        $('body').off('keydown.shapeEditor');
        this._commonBordersCheckbox.css('display', 'none');
        this._commonBordersCheckbox.parent().css('display', 'none');
        if (this._borderSticker) {
            this._borderSticker.disable();
            this._borderSticker = null;
        }
    }


    onPolyshapeEditorUpdate(model) {
        if (model.active && !this._data) {
            this._data = model.data;
            this._startEdit();
        }
        else if (!model.active) {
            this._endEdit();
        }
    }

    onPlayerUpdate(player) {
        let scale = player.geometry.scale;
        if (this._scale != scale) {
            this._scale = scale;

            if (this._borderSticker) {
                this._borderSticker.scale(this._scale);
            }

            let strokeWidth = this._data && this._data.type === 'points' ? 0 : STROKE_WIDTH / this._scale;
            let pointRadius = POINT_RADIUS / this._scale;

            if (this._originalShape) {
                this._originalShape.attr('stroke-width', strokeWidth);
            }

            if (this._correctLine) {
                this._correctLine.attr('stroke-width', strokeWidth / 2);
            }

            for (let uiPoint of this._originalShapePoints) {
                uiPoint.attr('stroke-width', strokeWidth);
                uiPoint.radius(pointRadius);
            }

            this._rescaleDrawPoints();
        }

        // Abort if frame have been changed
        if (player.frames.current != this._frame && this._data) {
            this._controller.cancel();
        }
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    callAnnotationUI:false
    Logger:false
    platform:false
*/

String.normalize = () => {
    let target = this;
    target = target.charAt(0).toUpperCase() + target.substr(1);
    return target;
};

window.onload = function boot() {
    window.onerror = function exception(errorMsg, url, lineNumber, colNumber, error) {
        Logger.sendException(
            errorMsg,
            url,
            lineNumber,
            colNumber ? String(colNumber) : '',
            error && error.stack ? error.stack : '',
            `${platform.name} ${platform.version}`,
            platform.os.toString(),
        ).catch(() => {});
    };

    const id = window.location.href.match('id=[0-9]+')[0].slice(3);
    callAnnotationUI(id);
};

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported PolyShapeModel buildShapeModel buildShapeController buildShapeView PolyShapeView */

/* global
    AAMUndefinedKeyword:false
    blurAllElements:false
    drawBoxSize:false
    Listener:false
    Logger:false
    Mousetrap:false
    ShapeCollectionView:false
    SVG:false
    LabelsInfo:false
*/

"use strict";

const STROKE_WIDTH = 2.5;
const SELECT_POINT_STROKE_WIDTH = 2.5;
const POINT_RADIUS = 5;
const AREA_TRESHOLD = 9;
const TEXT_MARGIN = 10;

/******************************** SHAPE MODELS  ********************************/

class ShapeModel extends Listener {
    constructor(data, positions, type, clientID, color) {
        super('onShapeUpdate', () => this );
        this._serverID = data.id;
        this._id = clientID;
        this._groupId = data.group || 0;
        this._type = type;
        this._color = color;
        this._label = data.label_id;
        this._frame = type.split('_')[0] === 'annotation' ? data.frame :
            positions.filter((pos) => pos.frame < window.cvat.player.frames.start).length ?
                window.cvat.player.frames.start : Math.min(...positions.map((pos) => pos.frame));
        this._removed = false;
        this._locked = false;
        this._merging = false;
        this._active = false;
        this._selected = false;
        this._activeAttributeId = null;
        this._merge = false;
        this._hiddenShape = false;
        this._hiddenText = true;
        this._updateReason = null;
        this._importAttributes(data.attributes, positions);
    }

    _importAttributes(attributes, positions) {
        let converted = {};
        for (let attr of attributes) {
            converted[attr.id] = attr.value;
        }
        attributes = converted;

        this._attributes = {
            immutable: {},
            mutable: {},
        };

        let labelsInfo = window.cvat.labelsInfo;
        let labelAttributes = labelsInfo.labelAttributes(this._label);
        for (let attrId in labelAttributes) {
            let attrInfo = labelsInfo.attrInfo(attrId);
            if (attrInfo.mutable) {
                this._attributes.mutable[this._frame] = this._attributes.mutable[this._frame] || {};
                this._attributes.mutable[this._frame][attrId] = attrInfo.values[0];
            } else {
                this._attributes.immutable[attrId] = attrInfo.values[0];
            }
        }

        for (let attrId in attributes) {
            let attrInfo = labelsInfo.attrInfo(attrId);
            const labelValue = LabelsInfo.normalize(attrInfo.type, attributes[attrId]);
            if (attrInfo.mutable) {
                this._attributes.mutable[this._frame][attrId] = labelValue;
            } else {
                this._attributes.immutable[attrId] = labelValue;
            }
        }

        for (const pos of positions) {
            for (const attr of pos.attributes) {
                const attrInfo = labelsInfo.attrInfo(attr.id);
                if (attrInfo.mutable) {
                    this._attributes.mutable[pos.frame] = this._attributes.mutable[pos.frame] || {};
                    const labelValue = LabelsInfo.normalize(attrInfo.type, attr.value);
                    this._attributes.mutable[pos.frame][attr.id] = labelValue;
                }
            }
        }
    }

    _interpolateAttributes(frame) {
        let labelsInfo = window.cvat.labelsInfo;
        let interpolated = {};
        for (let attrId in this._attributes.immutable) {
            let attrInfo = labelsInfo.attrInfo(attrId);
            interpolated[attrId] = {
                name: attrInfo.name,
                value: this._attributes.immutable[attrId],
            };
        }

        if (!Object.keys(this._attributes.mutable).length) {
            return interpolated;
        }

        let mutableAttributes = {};
        for (let attrId in window.cvat.labelsInfo.labelAttributes(this._label)) {
            let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
            if (attrInfo.mutable) {
                mutableAttributes[attrId] = attrInfo.name;
            }
        }

        for (let attrId in mutableAttributes) {
            for (let frameKey in this._attributes.mutable) {
                frameKey = +frameKey;
                if (attrId in this._attributes.mutable[frameKey] &&
                    (frameKey <= frame || !(attrId in interpolated))) {
                    interpolated[attrId] = {
                        name: mutableAttributes[attrId],
                        value: this._attributes.mutable[frameKey][attrId],
                    };
                }
            }

            if (!(attrId != interpolated)) {
                throw Error(`Keyframe for mutable attribute not found. Frame: ${frame}, attributeId: ${attrId}`);
            }
        }

        return interpolated;
    }

    _neighboringFrames(frame) {
        if (!Number.isInteger(frame) || frame < 0) {
            throw Error(`Got invalid frame: ${frame}`);
        }

        let leftFrame = null;
        let rightFrame = null;

        for (let frameKey in this._positions) {
            frameKey = +frameKey;
            if (frameKey < frame && (frameKey > leftFrame || leftFrame === null)) {
                leftFrame = frameKey;
            }

            if (frameKey > frame && (frameKey < rightFrame || rightFrame === null)) {
                rightFrame = frameKey;
            }
        }

        return [leftFrame, rightFrame];
    }

    // Function mark frames which contain attribute updates as key frames
    _setupKeyFrames() {
        for (let frame in this._attributes.mutable) {
            if (!(frame in this._positions)) {
                let position = this._interpolatePosition(+frame);
                this.updatePosition(+frame, position, true);
            }
        }
    }

    _computeFrameCount() {
        if (this._type.split('_')[0] === 'annotation') {
            return 1;
        }

        let counter = 0;
        let visibleFrame = null;
        let hiddenFrame = null;
        let last = 0;
        for (let frame in this._positions) {
            if (visibleFrame === null && !this._positions[frame].outside) {
                visibleFrame = +frame;
            }
            else if (visibleFrame != null && this._positions[frame].outside) {
                hiddenFrame = +frame;
                counter += hiddenFrame - visibleFrame;
                visibleFrame = null;
                hiddenFrame = null;
            }
            last = +frame;
        }

        if (visibleFrame != null) {
            if (this._type === 'interpolation_box'
                || this._type === 'interpolation_points') {
                counter += window.cvat.player.frames.stop - visibleFrame + 1;
            }
            else {
                counter += last - visibleFrame + 1;
            }
        }
        return counter;
    }

    notify(updateReason) {
        let oldReason = this._updateReason;
        this._updateReason = updateReason;
        try {
            Listener.prototype.notify.call(this);
        }
        finally {
            this._updateReason = oldReason;
        }
    }

    collectStatistic() {
        let collectObj = {};
        collectObj.type = this._type.split('_')[1];
        collectObj.mode = this._type.split('_')[0];
        collectObj.labelId = this._label;
        collectObj.manually = Object.keys(this._positions).length;
        for (let frame in this._positions) {
            if (this._positions[frame].outside) {
                collectObj.manually --;
            }
        }
        collectObj.total = this._computeFrameCount();
        collectObj.interpolated = collectObj.total - collectObj.manually;

        return collectObj;
    }

    updateAttribute(frame, attrId, value) {
        let labelsInfo = window.cvat.labelsInfo;
        let attrInfo = labelsInfo.attrInfo(attrId);

        Logger.addEvent(Logger.EventType.changeAttribute, {
            attrId: attrId,
            value: value,
            attrName: attrInfo.name
        });

        // Undo/redo code
        let oldAttr = attrInfo.mutable ? this._attributes.mutable[frame] ? this._attributes.mutable[frame][attrId] : undefined :
            this._attributes.immutable[attrId];

        window.cvat.addAction('Change Attribute', () => {
            if (typeof(oldAttr) === 'undefined') {
                delete this._attributes.mutable[frame][attrId];
                this.notify('attributes');
            }
            else {
                this.updateAttribute(frame, attrId, oldAttr);
            }
        }, () => {
            this.updateAttribute(frame, attrId, value);
        }, frame);
        // End of undo/redo code

        if (attrInfo.mutable) {
            this._attributes.mutable[frame] = this._attributes.mutable[frame]|| {};
            this._attributes.mutable[frame][attrId] = LabelsInfo.normalize(attrInfo.type, value);
            this._setupKeyFrames();
        } else {
            this._attributes.immutable[attrId] = LabelsInfo.normalize(attrInfo.type, value);
        }

        this.notify('attributes');
    }

    changeLabel(labelId) {
        Logger.addEvent(Logger.EventType.changeLabel, {
            from: this._label,
            to: labelId,
        });

        if (labelId in window.cvat.labelsInfo.labels()) {
            this._label = +labelId;
            this._importAttributes([], []);
            this._setupKeyFrames();
            this.notify('changelabel');
        }
        else {
            throw Error(`Unknown label id value found: ${labelId}`);
        }
    }

    changeColor(color) {
        this._color = color;
        this.notify('color');
    }

    interpolate(frame) {
        return {
            attributes: this._interpolateAttributes(frame),
            position: this._interpolatePosition(frame)
        };
    }

    switchOccluded(frame) {
        let position = this._interpolatePosition(frame);
        position.occluded = !position.occluded;

        // Undo/redo code
        window.cvat.addAction('Change Occluded', () => {
            this.switchOccluded(frame);
        }, () => {
            this.switchOccluded(frame);
        }, frame);
        // End of undo/redo code

        this.updatePosition(frame, position, true);
        this.notify('occluded');
    }

    switchLock() {
        this._locked = !this._locked;
        this.notify('lock');
    }

    switchHide() {
        if (!this._hiddenText) {
            this._hiddenText = true;
            this._hiddenShape = false;
        }
        else if (this._hiddenText && !this._hiddenShape) {
            this._hiddenShape = true;
            this._hiddenText = true;
        }
        else if (this._hiddenText && this._hiddenShape) {
            this._hiddenShape = false;
            this._hiddenText = false;
        }

        this.notify('hidden');
    }

    switchOutside(frame) {
        // Only for interpolation shapes
        if (this._type.split('_')[0] !== 'interpolation') {
            return;
        }

        // Undo/redo code
        let oldPos = Object.assign({}, this._positions[frame]);
        window.cvat.addAction('Change Outside', () => {
            if (!Object.keys(oldPos).length) {
                // Frame hasn't been a keyframe, remove it from position and redestribute attributes
                delete this._positions[frame];
                this._frame = Math.min(...Object.keys(this._positions).map((el) => +el));
                if (frame < this._frame && frame in this._attributes.mutable) {
                    this._attributes.mutable[this._frame] = this._attributes.mutable[frame];
                }

                if (frame in this._attributes.mutable) {
                    delete this._attributes.mutable[frame];
                }

                this.notify('outside');
            }
            else {
                this.switchOutside(frame);
            }
        }, () => {
            this.switchOutside(frame);
        }, frame);
        // End of undo/redo code

        let position = this._interpolatePosition(frame);
        position.outside = !position.outside;
        this.updatePosition(frame, position, true);

        // Update the start frame if need and redestribute attributes
        if (frame < this._frame) {
            if (this._frame in this._attributes.mutable) {
                this._attributes.mutable[frame] = this._attributes.mutable[this._frame];
                delete (this._attributes.mutable[this._frame]);
            }
            this._frame = frame;
        }

        this.notify('outside');
    }

    switchKeyFrame(frame) {
        // Only for interpolation shapes
        if (this._type.split('_')[0] !== 'interpolation') {
            return;
        }

        // Undo/redo code
        const oldPos = Object.assign({}, this._positions[frame]);
        window.cvat.addAction('Change Keyframe', () => {
            this.switchKeyFrame(frame);
            if (frame in this._positions) {
                this.updatePosition(frame, oldPos);
            }
        }, () => {
            this.switchKeyFrame(frame);
        }, frame);
        // End of undo/redo code

        if (frame in this._positions && Object.keys(this._positions).length > 1) {
            // If frame is first object frame, need redestribute attributes
            if (frame === this._frame) {
                this._frame = Object.keys(this._positions).map((el) => +el).sort((a,b) => a - b)[1];
                if (frame in this._attributes.mutable) {
                    this._attributes.mutable[this._frame] = this._attributes.mutable[frame];
                    delete (this._attributes.mutable[frame]);
                }
            }
            delete (this._positions[frame]);
        } else {
            let position = this._interpolatePosition(frame);
            this.updatePosition(frame, position, true);

            if (frame < this._frame) {
                if (this._frame in this._attributes.mutable) {
                    this._attributes.mutable[frame] = this._attributes.mutable[this._frame];
                    delete (this._attributes.mutable[this._frame]);
                }
                this._frame = frame;
            }
        }

        this.notify('keyframe');
    }

    click() {
        this.notify('click');
    }

    prevKeyFrame() {
        return this._neighboringFrames(window.cvat.player.frames.current)[0];
    }

    nextKeyFrame() {
        return this._neighboringFrames(window.cvat.player.frames.current)[1];
    }

    initKeyFrame() {
        return this._frame;
    }

    isKeyFrame(frame) {
        return frame in this._positions;
    }

    select() {
        if (!this._selected) {
            this._selected = true;
            this.notify('selection');
        }
    }

    deselect() {
        if (this._selected) {
            this._selected = false;
            this.notify('selection');
        }
    }

    // Explicit remove by user
    remove() {
        Logger.addEvent(Logger.EventType.deleteObject, {
            count: 1,
        });

        this.removed = true;

        // Undo/redo code
        window.cvat.addAction('Remove Object', () => {
            this.removed = false;
        }, () => {
            this.removed = true;
        }, window.cvat.player.frames.current);
        // End of undo/redo code
    }

    set z_order(value) {
        if (!this._locked) {
            let frame = window.cvat.player.frames.current;
            let position = this._interpolatePosition(frame);
            position.z_order = value;
            this.updatePosition(frame, position, true);
            this.notify('z_order');
        }
    }

    set removed(value) {
        if (value) {
            this._active = false;
            this._serverID = undefined;
        }

        this._removed = value;
        this.notify('remove');
    }

    get removed() {
        return this._removed;
    }

    get lock() {
        return this._locked;
    }

    get hiddenShape() {
        return this._hiddenShape;
    }

    get hiddenText() {
        return this._hiddenText;
    }

    set active(value) {
        this._active = value;
        if (!this._removed && !['drag', 'resize'].includes(window.cvat.mode)) {
            this.notify('activation');
        }
    }

    get active() {
        return this._active;
    }

    set activeAttribute(value) {
        this._activeAttributeId = value;
        this.notify('activeAttribute');
    }

    get activeAttribute() {
        return this._activeAttributeId;
    }

    set merge(value) {
        this._merge = value;
        this.notify('merge');
    }

    get merge() {
        return this._merge;
    }

    set groupping(value) {
        this._groupping = value;
        this.notify('groupping');
    }

    get groupping() {
        return this._groupping;
    }

    set groupId(value) {
        this._groupId = value;
    }

    get groupId() {
        return this._groupId;
    }

    get type() {
        return this._type;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get serverID() {
        return this._serverID;
    }

    set serverID(value) {
        this._serverID = value;
    }

    get frame() {
        return this._frame;
    }

    get color() {
        return this._color;
    }

    get updateReason() {
        return this._updateReason;
    }

    get label() {
        return this._label;
    }

    get keyframes() {
        return Object.keys(this._positions);
    }

    get selected() {
        return this._selected;
    }
}


class BoxModel extends ShapeModel {
    constructor(data, type, clientID, color) {
        super(data, data.shapes || [], type, clientID, color);
        this._positions = BoxModel.importPositions.call(this, data.shapes || data);
        this._setupKeyFrames();
    }

    _interpolatePosition(frame) {
        if (this._type.startsWith('annotation')) {
            return Object.assign({},
                this._positions[this._frame],
                {
                    outside: this._frame != frame
                }
            );
        }

        let [leftFrame, rightFrame] = this._neighboringFrames(frame);
        if (frame in this._positions) {
            leftFrame = frame;
        }

        let leftPos = null;
        let rightPos = null;

        if (leftFrame != null) leftPos = this._positions[leftFrame];
        if (rightFrame != null) rightPos = this._positions[rightFrame];

        if (!leftPos) {
            if (rightPos) {
                return Object.assign({}, rightPos, {
                    outside: true,
                });
            }
            else {
                return {
                    outside: true
                };
            }
        }

        if (frame === leftFrame || leftPos.outside || !rightPos || rightPos.outside) {
            return Object.assign({}, leftPos);
        }

        let moveCoeff = (frame - leftFrame) / (rightFrame - leftFrame);

        return {
            xtl: leftPos.xtl + (rightPos.xtl - leftPos.xtl) * moveCoeff,
            ytl: leftPos.ytl + (rightPos.ytl - leftPos.ytl) * moveCoeff,
            xbr: leftPos.xbr + (rightPos.xbr - leftPos.xbr) * moveCoeff,
            ybr: leftPos.ybr + (rightPos.ybr - leftPos.ybr) * moveCoeff,
            occluded: leftPos.occluded,
            outside: leftPos.outside,
            z_order: leftPos.z_order,
        };
    }

    _verifyArea(box) {
        return ((box.xbr - box.xtl) * (box.ybr - box.ytl) >= AREA_TRESHOLD);
    }

    updatePosition(frame, position, silent) {
        let pos = {
            xtl: Math.clamp(position.xtl, 0, window.cvat.player.geometry.frameWidth),
            ytl: Math.clamp(position.ytl, 0, window.cvat.player.geometry.frameHeight),
            xbr: Math.clamp(position.xbr, 0, window.cvat.player.geometry.frameWidth),
            ybr: Math.clamp(position.ybr, 0, window.cvat.player.geometry.frameHeight),
            occluded: position.occluded,
            z_order: position.z_order,
        };

        if (this._verifyArea(pos)) {
            if (this._type === 'annotation_box') {
                if (this._frame != frame) {
                    throw Error(`Got bad frame for annotation box during update position: ${frame}. Own frame is ${this._frame}`);
                }
            }

            if (!silent) {
                // Undo/redo code
                let oldPos = Object.assign({}, this._positions[frame]);
                window.cvat.addAction('Change Position', () => {
                    if (!Object.keys(oldPos).length) {
                        delete this._positions[frame];
                        this.notify('position');
                    }
                    else {
                        this.updatePosition(frame, oldPos, false);
                    }
                }, () => {
                    this.updatePosition(frame, pos, false);
                }, frame);
                // End of undo/redo code
            }

            if (this._type === 'annotation_box') {
                this._positions[frame] = pos;
            }
            else {
                this._positions[frame] = Object.assign(pos, {
                    outside: position.outside,
                });
            }
        }

        if (!silent) {
            this.notify('position');
        }
    }

    contain(mousePos, frame) {
        let pos = this._interpolatePosition(frame);
        if (pos.outside) return false;
        let x = mousePos.x;
        let y = mousePos.y;
        return (x >= pos.xtl && x <= pos.xbr && y >= pos.ytl && y <= pos.ybr);
    }

    distance(mousePos, frame) {
        let pos = this._interpolatePosition(frame);
        if (pos.outside) return Number.MAX_SAFE_INTEGER;
        let points = [{x: pos.xtl, y: pos.ytl,}, {x: pos.xbr, y: pos.ytl,}, {x: pos.xbr, y: pos.ybr,}, {x: pos.xtl, y: pos.ybr,}];
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < points.length; i ++) {
            let p1 = points[i];
            let p2 = points[i+1] || points[0];

            // perpendicular from point to straight length
            let distance = (Math.abs((p2.y - p1.y) * mousePos.x - (p2.x - p1.x) * mousePos.y + p2.x * p1.y - p2.y * p1.x)) /
                Math.sqrt(Math.pow(p2.y - p1.y, 2) + Math.pow(p2.x - p1.x, 2));

            // check if perpendicular belongs to the straight segment
            let a = Math.pow(p1.x - mousePos.x, 2) + Math.pow(p1.y - mousePos.y, 2);
            let b = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
            let c = Math.pow(p2.x - mousePos.x, 2) + Math.pow(p2.y - mousePos.y, 2);
            if (distance < minDistance && (a + b - c) >= 0 && (c + b - a) >= 0) {
                minDistance = distance;
            }
        }
        return minDistance;
    }

    export() {
        const objectAttributes = [];
        for (let attributeId in this._attributes.immutable) {
            objectAttributes.push({
                id: +attributeId,
                value: String(this._attributes.immutable[attributeId]),
            });
        }

        if (this._type === 'annotation_box') {
            if (this._frame in this._attributes.mutable) {
                for (let attrId in this._attributes.mutable[this._frame]) {
                    objectAttributes.push({
                        id: +attrId,
                        value: String(this._attributes.mutable[this._frame][attrId]),
                    });
                }
            }

            return Object.assign({}, {
                id: this._serverID,
                attributes: objectAttributes,
                label_id: this._label,
                group: this._groupId,
                frame: this._frame,
                type: 'box',
            }, this._positions[this._frame]);
        }
        else {
            const track = {
                id: this._serverID,
                label_id: this._label,
                group: this._groupId,
                frame: this._frame,
                attributes: objectAttributes,
                shapes: [],
            };

            for (let frame in this._positions) {
                const shapeAttributes = [];
                if (frame in this._attributes.mutable) {
                    for (let attrId in this._attributes.mutable[frame]) {
                        shapeAttributes.push({
                            id: +attrId,
                            value: String(this._attributes.mutable[frame][attrId]),
                        });
                    }
                }

                track.shapes.push(Object.assign({}, {
                    frame: +frame,
                    type: 'box',
                    attributes: shapeAttributes,
                }, this._positions[frame]));
            }

            return track;
        }
    }

    removePoint() {
        // nothing do
    }

    static importPositions(positions) {
        let imported = {};
        if (this._type === 'interpolation_box') {
            let last_key_in_prev_segm = null;
            let segm_start = window.cvat.player.frames.start;
            let segm_stop = window.cvat.player.frames.stop;

            for (let pos of positions) {
                let frame = pos.frame;

                if (frame >= segm_start && frame <= segm_stop) {
                    imported[frame] = {
                        xtl: pos.xtl,
                        ytl: pos.ytl,
                        xbr: pos.xbr,
                        ybr: pos.ybr,
                        occluded: pos.occluded,
                        outside: pos.outside,
                        z_order: pos.z_order,
                    };
                }
                else {
                    console.log(`Frame ${frame} has been found in segment [${segm_start}-${segm_stop}]. It have been ignored.`);
                    if (!last_key_in_prev_segm || frame > last_key_in_prev_segm.frame) {
                        last_key_in_prev_segm = pos;
                    }
                }
            }

            if (last_key_in_prev_segm && !(segm_start in imported)) {
                imported[segm_start] = {
                    xtl: last_key_in_prev_segm.xtl,
                    ytl: last_key_in_prev_segm.ytl,
                    xbr: last_key_in_prev_segm.xbr,
                    ybr: last_key_in_prev_segm.ybr,
                    occluded: last_key_in_prev_segm.occluded,
                    outside: last_key_in_prev_segm.outside,
                    z_order: last_key_in_prev_segm.z_order,
                };
            }

            return imported;
        }

        imported[this._frame] = {
            xtl: positions.xtl,
            ytl: positions.ytl,
            xbr: positions.xbr,
            ybr: positions.ybr,
            occluded: positions.occluded,
            z_order: positions.z_order,
        };

        return imported;
    }
}

class PolyShapeModel extends ShapeModel {
    constructor(data, type, clientID, color) {
        super(data, data.shapes || [], type, clientID, color);
        this._positions = PolyShapeModel.importPositions.call(this, data.shapes || data);
        this._setupKeyFrames();
    }

    _interpolatePosition(frame) {
        if (this._type.startsWith('annotation')) {
            return Object.assign({},
                this._positions[this._frame],
                {
                    outside: this._frame != frame
                }
            );
        }

        let [leftFrame, rightFrame] = this._neighboringFrames(frame);
        if (frame in this._positions) {
            leftFrame = frame;
        }

        let leftPos = null;
        let rightPos = null;

        if (leftFrame != null) leftPos = this._positions[leftFrame];
        if (rightFrame != null) rightPos = this._positions[rightFrame];

        if (!leftPos) {
            if (rightPos) {
                return Object.assign({}, rightPos, {
                    outside: true,
                });
            }
            else {
                return {
                    outside: true
                };
            }
        }

        return Object.assign({}, leftPos, {
            outside: leftPos.outside || leftFrame !== frame,
        });
    }

    updatePosition(frame, position, silent) {
        let box = {
            xtl: Number.MAX_SAFE_INTEGER,
            ytl: Number.MAX_SAFE_INTEGER,
            xbr: Number.MIN_SAFE_INTEGER,
            ybr: Number.MIN_SAFE_INTEGER,
        };

        let points = PolyShapeModel.convertStringToNumberArray(position.points);
        for (let point of points) {
            point.x = Math.clamp(point.x, 0, window.cvat.player.geometry.frameWidth);
            point.y = Math.clamp(point.y, 0, window.cvat.player.geometry.frameHeight);

            box.xtl = Math.min(box.xtl, point.x);
            box.ytl = Math.min(box.ytl, point.y);
            box.xbr = Math.max(box.xbr, point.x);
            box.ybr = Math.max(box.ybr, point.y);
        }
        position.points = PolyShapeModel.convertNumberArrayToString(points);

        let pos = {
            height: box.ybr - box.ytl,
            width: box.xbr - box.xtl,
            occluded: position.occluded,
            points: position.points,
            z_order: position.z_order,
        };

        if (this._verifyArea(box)) {
            if (!silent) {
                // Undo/redo code
                const oldPos = Object.assign({}, this._positions[frame]);
                window.cvat.addAction('Change Position', () => {
                    if (!Object.keys(oldPos).length) {
                        delete this._positions[frame];
                        this.notify('position');
                    } else {
                        this.updatePosition(frame, oldPos, false);
                    }
                }, () => {
                    this.updatePosition(frame, pos, false);
                }, frame);
                // End of undo/redo code
            }

            if (this._type.startsWith('annotation')) {
                if (this._frame !== frame) {
                    throw Error(`Got bad frame for annotation poly shape during update position: ${frame}. Own frame is ${this._frame}`);
                }
                this._positions[frame] = pos;
            }
            else {
                this._positions[frame] = Object.assign(pos, {
                    outside: position.outside,
                });
            }
        }

        if (!silent) {
            this.notify('position');
        }
    }

    export() {
        const objectAttributes = [];
        for (let attrId in this._attributes.immutable) {
            objectAttributes.push({
                id: +attrId,
                value: String(this._attributes.immutable[attrId]),
            });
        }

        if (this._type.startsWith('annotation')) {
            if (this._frame in this._attributes.mutable) {
                for (let attrId in this._attributes.mutable[this._frame]) {
                    objectAttributes.push({
                        id: +attrId,
                        value: String(this._attributes.mutable[this._frame][attrId]),
                    });
                }
            }

            return Object.assign({}, {
                id: this._serverID,
                attributes: objectAttributes,
                label_id: this._label,
                group: this._groupId,
                frame: this._frame,
                type: this._type.split('_')[1],
            }, this._positions[this._frame]);
        }
        else {
            const track = {
                id: this._serverID,
                attributes: objectAttributes,
                label_id: this._label,
                group: this._groupId,
                frame: this._frame,
                shapes: [],
            };

            for (let frame in this._positions) {
                let shapeAttributes = [];
                if (frame in this._attributes.mutable) {
                    for (let attrId in this._attributes.mutable[frame]) {
                        shapeAttributes.push({
                            id: +attrId,
                            value: String(this._attributes.mutable[frame][attrId]),
                        });
                    }
                }

                track.shapes.push(Object.assign({
                    frame: +frame,
                    attributes: shapeAttributes,
                    type: this._type.split('_')[1],
                }, this._positions[frame]));
            }

            return track;
        }
    }

    removePoint(idx) {
        let frame = window.cvat.player.frames.current;
        let position = this._interpolatePosition(frame);
        let points = PolyShapeModel.convertStringToNumberArray(position.points);
        if (points.length > this._minPoints) {
            points.splice(idx, 1);
            position.points = PolyShapeModel.convertNumberArrayToString(points);
            this.updatePosition(frame, position);
        }
    }

    static convertStringToNumberArray(serializedPoints) {
        let pointArray = [];
        for (let pair of serializedPoints.split(' ')) {
            pointArray.push({
                x: +pair.split(',')[0],
                y: +pair.split(',')[1],
            });
        }
        return pointArray;
    }

    static convertNumberArrayToString(arrayPoints) {
        return arrayPoints.map(point => `${point.x},${point.y}`).join(' ');
    }

    static importPositions(positions) {
        function getBBRect(points) {
            const box = {
                xtl: Number.MAX_SAFE_INTEGER,
                ytl: Number.MAX_SAFE_INTEGER,
                xbr: Number.MIN_SAFE_INTEGER,
                ybr: Number.MIN_SAFE_INTEGER,
            };

            for (let point of PolyShapeModel.convertStringToNumberArray(points)) {
                box.xtl = Math.min(box.xtl, point.x);
                box.ytl = Math.min(box.ytl, point.y);
                box.xbr = Math.max(box.xbr, point.x);
                box.ybr = Math.max(box.ybr, point.y);
            }

            return [box.xbr - box.xtl, box.ybr - box.ytl];
        }

        let imported = {};
        if (this._type.startsWith('interpolation')) {
            let last_key_in_prev_segm = null;
            let segm_start = window.cvat.player.frames.start;
            let segm_stop = window.cvat.player.frames.stop;

            for (let pos of positions) {
                let frame = pos.frame;
                if (frame >= segm_start && frame <= segm_stop) {
                    const [width, height] = getBBRect(pos.points);
                    imported[pos.frame] = {
                        width: width,
                        height: height,
                        points: pos.points,
                        occluded: pos.occluded,
                        outside: pos.outside,
                        z_order: pos.z_order,
                    };
                }
                else {
                    console.log(`Frame ${frame} has been found in segment [${segm_start}-${segm_stop}]. It have been ignored.`);
                    if (!last_key_in_prev_segm || frame > last_key_in_prev_segm.frame) {
                        last_key_in_prev_segm = pos;
                    }
                }
            }

            if (last_key_in_prev_segm && !(segm_start in imported)) {
                const [width, height] = getBBRect(last_key_in_prev_segm.points);
                imported[segm_start] = {
                    width: width,
                    height: height,
                    points: last_key_in_prev_segm.points,
                    occluded: last_key_in_prev_segm.occluded,
                    outside: last_key_in_prev_segm.outside,
                    z_order: last_key_in_prev_segm.z_order,
                };
            }

            return imported;
        }

        const [width, height] = getBBRect(positions.points);
        imported[this._frame] = {
            width: width,
            height: height,
            points: positions.points,
            occluded: positions.occluded,
            z_order: positions.z_order,
        };

        return imported;
    }
}

class PointsModel extends PolyShapeModel {
    constructor(data, type, clientID, color) {
        super(data, type, clientID, color);
        this._minPoints = 1;
    }

    _interpolatePosition(frame) {
        if (this._type.startsWith('annotation')) {
            return Object.assign({}, this._positions[this._frame], {
                outside: this._frame !== frame,
            });
        }

        let [leftFrame, rightFrame] = this._neighboringFrames(frame);
        if (frame in this._positions) {
            leftFrame = frame;
        }

        let leftPos = null;
        let rightPos = null;

        if (leftFrame != null) leftPos = this._positions[leftFrame];
        if (rightFrame != null) rightPos = this._positions[rightFrame];

        if (!leftPos) {
            if (rightPos) {
                return Object.assign({}, rightPos, {
                    outside: true,
                });
            }

            return {
                outside: true,
            };
        }

        if (frame === leftFrame || leftPos.outside || !rightPos || rightPos.outside) {
            return Object.assign({}, leftPos);
        }

        const rightPoints = PolyShapeModel.convertStringToNumberArray(rightPos.points);
        const leftPoints = PolyShapeModel.convertStringToNumberArray(leftPos.points);

        if (rightPoints.length === leftPoints.length && leftPoints.length === 1) {
            const moveCoeff = (frame - leftFrame) / (rightFrame - leftFrame);
            const interpolatedPoints = [{
                x: leftPoints[0].x + (rightPoints[0].x - leftPoints[0].x) * moveCoeff,
                y: leftPoints[0].y + (rightPoints[0].y - leftPoints[0].y) * moveCoeff,
            }];

            return Object.assign({}, leftPos, {
                points: PolyShapeModel.convertNumberArrayToString(interpolatedPoints),
            });
        }

        return Object.assign({}, leftPos, {
            outside: true,
        });
    }

    distance(mousePos, frame) {
        let pos = this._interpolatePosition(frame);
        if (pos.outside) return Number.MAX_SAFE_INTEGER;
        let points = PolyShapeModel.convertStringToNumberArray(pos.points);
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let point of points) {
            let distance = Math.sqrt(Math.pow(point.x - mousePos.x, 2) + Math.pow(point.y - mousePos.y, 2));
            if (distance < minDistance) {
                minDistance = distance;
            }
        }
        return minDistance;
    }

    _verifyArea() {
        return true;
    }
}


class PolylineModel extends PolyShapeModel {
    constructor(data, type, clientID, color) {
        super(data, type, clientID, color);
        this._minPoints = 2;
    }

    _verifyArea(box) {
        return ((box.xbr - box.xtl) >= AREA_TRESHOLD || (box.ybr - box.ytl) >= AREA_TRESHOLD);
    }

    distance(mousePos, frame) {
        let pos = this._interpolatePosition(frame);
        if (pos.outside) return Number.MAX_SAFE_INTEGER;
        let points = PolyShapeModel.convertStringToNumberArray(pos.points);
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < points.length - 1; i ++) {
            let p1 = points[i];
            let p2 = points[i+1];

            // perpendicular from point to straight length
            let distance = (Math.abs((p2.y - p1.y) * mousePos.x - (p2.x - p1.x) * mousePos.y + p2.x * p1.y - p2.y * p1.x)) /
                Math.sqrt(Math.pow(p2.y - p1.y, 2) + Math.pow(p2.x - p1.x, 2));

            // check if perpendicular belongs to the straight segment
            let a = Math.pow(p1.x - mousePos.x, 2) + Math.pow(p1.y - mousePos.y, 2);
            let b = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
            let c = Math.pow(p2.x - mousePos.x, 2) + Math.pow(p2.y - mousePos.y, 2);
            if (distance < minDistance && (a + b - c) >= 0 && (c + b - a) >= 0) {
                minDistance = distance;
            }
        }
        return minDistance;
    }
}


class PolygonModel extends PolyShapeModel {
    constructor(data, type, id, color) {
        super(data, type, id, color);
        this._minPoints = 3;
        this._draggable = false;
    }

    _verifyArea(box) {
        return ((box.xbr - box.xtl) * (box.ybr - box.ytl) >= AREA_TRESHOLD);
    }

    contain(mousePos, frame) {
        let pos = this._interpolatePosition(frame);
        if (pos.outside) return false;
        let points = PolyShapeModel.convertStringToNumberArray(pos.points);
        let wn = 0;
        for (let i = 0; i < points.length; i ++) {
            let p1 = points[i];
            let p2 = points[i + 1] || points[0];

            if (p1.y <= mousePos.y) {
                if (p2.y > mousePos.y) {
                    if (isLeft(p1, p2, mousePos) > 0) {
                        wn ++;
                    }
                }
            }
            else {
                if (p2.y < mousePos.y) {
                    if (isLeft(p1, p2, mousePos) < 0) {
                        wn --;
                    }
                }
            }
        }

        return wn != 0;

        function isLeft(P0, P1, P2) {
            return ( (P1.x - P0.x) * (P2.y - P0.y) - (P2.x -  P0.x) * (P1.y - P0.y) );
        }
    }

    distance(mousePos, frame) {
        let pos = this._interpolatePosition(frame);
        if (pos.outside) return Number.MAX_SAFE_INTEGER;
        let points = PolyShapeModel.convertStringToNumberArray(pos.points);
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < points.length; i ++) {
            let p1 = points[i];
            let p2 = points[i+1] || points[0];

            // perpendicular from point to straight length
            let distance = (Math.abs((p2.y - p1.y) * mousePos.x - (p2.x - p1.x) * mousePos.y + p2.x * p1.y - p2.y * p1.x)) /
                Math.sqrt(Math.pow(p2.y - p1.y, 2) + Math.pow(p2.x - p1.x, 2));

            // check if perpendicular belongs to the straight segment
            let a = Math.pow(p1.x - mousePos.x, 2) + Math.pow(p1.y - mousePos.y, 2);
            let b = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
            let c = Math.pow(p2.x - mousePos.x, 2) + Math.pow(p2.y - mousePos.y, 2);
            if (distance < minDistance && (a + b - c) >= 0 && (c + b - a) >= 0) {
                minDistance = distance;
            }
        }
        return minDistance;
    }

    set draggable(value) {
        this._draggable = value;
        this.notify('draggable');
    }

    get draggable() {
        return this._draggable;
    }
}


/******************************** SHAPE CONTROLLERS  ********************************/

class ShapeController {
    constructor(shapeModel) {
        this._model = shapeModel;
    }

    updatePosition(frame, position) {
        this._model.updatePosition(frame, position);
    }

    updateAttribute(frame, attrId, value) {
        this._model.updateAttribute(frame, attrId, value);
    }

    interpolate(frame) {
        return this._model.interpolate(frame);
    }

    changeLabel(labelId) {
        this._model.changeLabel(labelId);
    }

    remove(e) {
        if (!window.cvat.mode) {
            if (!this._model.lock || e.shiftKey) {
                this._model.remove();
            }
        }
    }

    isKeyFrame(frame) {
        return this._model.isKeyFrame(frame);
    }

    switchOccluded() {
        this._model.switchOccluded(window.cvat.player.frames.current);
    }

    switchOutside() {
        this._model.switchOutside(window.cvat.player.frames.current);
    }

    switchKeyFrame() {
        this._model.switchKeyFrame(window.cvat.player.frames.current);
    }

    prevKeyFrame() {
        let frame = this._model.prevKeyFrame();
        if (Number.isInteger(frame)) {
            $('#frameNumber').prop('value', frame).trigger('change');
        }
    }

    nextKeyFrame() {
        let frame = this._model.nextKeyFrame();
        if (Number.isInteger(frame)) {
            $('#frameNumber').prop('value', frame).trigger('change');
        }
    }

    initKeyFrame() {
        let frame = this._model.initKeyFrame();
        $('#frameNumber').prop('value', frame).trigger('change');
    }

    switchLock() {
        this._model.switchLock();
    }

    switchHide() {
        this._model.switchHide();
    }

    click() {
        this._model.click();
    }

    model() {
        return this._model;
    }

    get id() {
        return this._model.id;
    }

    get label() {
        return this._model.label;
    }

    get type() {
        return this._model.type;
    }

    get lock() {
        return this._model.lock;
    }

    get merge() {
        return this._model.merge;
    }

    get hiddenShape() {
        return this._model.hiddenShape;
    }

    get hiddenText() {
        return this._model.hiddenText;
    }

    get color() {
        return this._model.color;
    }

    set active(value) {
        this._model.active = value;
    }
}


class BoxController extends ShapeController {
    constructor(boxModel) {
        super(boxModel);
    }
}

class PolyShapeController extends ShapeController {
    constructor(polyShapeModel) {
        super(polyShapeModel);
    }
}

class PointsController extends PolyShapeController {
    constructor(pointsModel) {
        super(pointsModel);
    }
}


class PolylineController extends PolyShapeController {
    constructor(polylineModel) {
        super(polylineModel);
    }
}

class PolygonController extends PolyShapeController {
    constructor(polygonModel) {
        super(polygonModel);
    }

    set draggable(value) {
        this._model.draggable = value;
    }

    get draggable() {
        return this._model.draggable;
    }
}


/******************************** SHAPE VIEWS  ********************************/
class ShapeView extends Listener {
    constructor(shapeModel, shapeController, svgScene, menusScene, textsScene) {
        super('onShapeViewUpdate', () => this);
        this._uis = {
            menu: null,
            attributes: {},
            buttons: {},
            changelabel: null,
            shape: null,
            text: null,
        };

        this._scenes = {
            svg: svgScene,
            menus: menusScene,
            texts: textsScene
        };

        this._appearance = {
            colors: shapeModel.color,
            fillOpacity: 0,
            selectedFillOpacity: 0.2,
        };

        this._flags = {
            editable: false,
            selected: false,
            dragging: false,
            resizing: false
        };

        this._controller = shapeController;
        this._updateReason = null;

        this._shapeContextMenu = $('#shapeContextMenu');
        this._pointContextMenu = $('#pointContextMenu');

        this._rightBorderFrame = $('#playerFrame')[0].offsetWidth;
        this._bottomBorderFrame = $('#playerFrame')[0].offsetHeight;

        shapeModel.subscribe(this);
    }


    _makeEditable() {
        if (this._uis.shape && this._uis.shape.node.parentElement && !this._flags.editable) {
            const events = {
                drag: null,
                resize: null,
            };

            this._uis.shape.front();
            if (!this._controller.lock) {
                // Setup drag events
                this._uis.shape.draggable().on('dragstart', () => {
                    events.drag = Logger.addContinuedEvent(Logger.EventType.dragObject);
                    this._flags.dragging = true;
                    blurAllElements();
                    this._hideShapeText();
                    this.notify('drag');
                }).on('dragend', (e) => {
                    const p1 = e.detail.handler.startPoints.point;
                    const p2 = e.detail.p;
                    events.drag.close();
                    events.drag = null;
                    this._flags.dragging = false;
                    if (Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2)) > 1) {
                        const frame = window.cvat.player.frames.current;
                        this._controller.updatePosition(frame, this._buildPosition());
                    }
                    this._showShapeText();
                    this.notify('drag');
                });

                // Setup resize events
                let objWasResized = false;
                this._uis.shape.selectize({
                    classRect: 'shapeSelect',
                    rotationPoint: false,
                    pointSize: POINT_RADIUS * 2 / window.cvat.player.geometry.scale,
                    deepSelect: true,
                }).resize({
                    snapToGrid: 0.1,
                }).on('resizestart', () => {
                    objWasResized = false;
                    this._flags.resizing = true;
                    events.resize = Logger.addContinuedEvent(Logger.EventType.resizeObject);
                    blurAllElements();
                    this._hideShapeText();
                    this.notify('resize');
                }).on('resizing', () => {
                    objWasResized = true;
                }).on('resizedone', () => {
                    events.resize.close();
                    events.resize = null;
                    this._flags.resizing = false;
                    if (objWasResized) {
                        const frame = window.cvat.player.frames.current;
                        this._controller.updatePosition(frame, this._buildPosition());
                        objWasResized = false;
                    }
                    this._showShapeText();
                    this.notify('resize');
                });

                let centers = ['t', 'r', 'b', 'l'];
                let corners = ['lt', 'rt', 'rb', 'lb'];
                let elements = {};
                for (let i = 0; i < 4; ++i) {
                    elements[centers[i]] = $(`.svg_select_points_${centers[i]}`);
                    elements[corners[i]] = $(`.svg_select_points_${corners[i]}`);
                }

                let angle = window.cvat.player.rotation;
                let offset = angle / 90 < 0 ? angle / 90 + centers.length : angle / 90;

                for (let i = 0; i < 4; ++i) {
                    elements[centers[i]].removeClass(`svg_select_points_${centers[i]}`)
                        .addClass(`svg_select_points_${centers[(i+offset) % centers.length]}`);
                    elements[corners[i]].removeClass(`svg_select_points_${corners[i]}`)
                        .addClass(`svg_select_points_${corners[(i+offset) % centers.length]}`);
                }

                this._updateColorForDots();
                let self = this;
                $('.svg_select_points').each(function() {
                    $(this).on('mouseover', () => {
                        this.instance.attr('stroke-width', STROKE_WIDTH * 2 / window.cvat.player.geometry.scale);
                    }).on('mouseout', () => {
                        this.instance.attr('stroke-width', STROKE_WIDTH / window.cvat.player.geometry.scale);
                    }).on('mousedown', () => {
                        self._positionateMenus();
                    });
                });

                this._flags.editable = true;
            }


            // Setup context menu
            this._uis.shape.on('mousedown.contextMenu', (e) => {
                if (e.which === 1) {
                    $('.custom-menu').hide(100);
                }
                if (e.which === 3) {
                    e.stopPropagation();
                }
            });

            this._uis.shape.on('contextmenu.contextMenu', (e) => {
                $('.custom-menu').hide(100);
                let type = this._controller.type.split('_');
                if (type[0] === 'interpolation') {
                    this._shapeContextMenu.find('.interpolationItem').removeClass('hidden');
                }
                else {
                    this._shapeContextMenu.find('.interpolationItem').addClass('hidden');
                }

                let dragPolyItem =  this._shapeContextMenu.find('.polygonItem[action="drag_polygon"]');
                let draggable = this._controller.draggable;
                if (type[1] === 'polygon') {
                    dragPolyItem.removeClass('hidden');
                    if (draggable) {
                        dragPolyItem.text('Disable Dragging');
                    }
                    else {
                        dragPolyItem.text('Enable Dragging');
                    }
                }
                else {
                    dragPolyItem.addClass('hidden');
                }

                this._shapeContextMenu.finish().show(100);
                let x = Math.min(e.pageX, this._rightBorderFrame - this._shapeContextMenu[0].scrollWidth);
                let y = Math.min(e.pageY, this._bottomBorderFrame - this._shapeContextMenu[0].scrollHeight);
                this._shapeContextMenu.offset({
                    left: x,
                    top: y,
                });

                e.preventDefault();
                e.stopPropagation();
            });
        }
    }


    _makeNotEditable() {
        if (this._uis.shape && this._flags.editable) {
            this._uis.shape.draggable(false).selectize(false, {
                deepSelect: true,
            }).resize(false);

            if (this._flags.resizing) {
                this._flags.resizing = false;
                this.notify('resize');
            }

            if (this._flags.dragging) {
                this._flags.dragging = false;
                this.notify('drag');
            }

            this._uis.shape.off('dragstart')
                .off('dragend')
                .off('resizestart')
                .off('resizing')
                .off('resizedone')
                .off('contextmenu.contextMenu')
                .off('mousedown.contextMenu');

            this._flags.editable = false;
        }

        $('.custom-menu').hide(100);
    }


    _select() {
        if (this._uis.shape && this._uis.shape.node.parentElement) {
            this._uis.shape.addClass('selectedShape');
            this._uis.shape.attr({
                'fill-opacity': this._appearance.selectedFillOpacity
            });
        }

        if (this._uis.menu) {
            this._uis.menu.addClass('highlightedUI');
        }
    }


    _deselect() {
        if (this._uis.shape) {
            this._uis.shape.removeClass('selectedShape');

            if (this._appearance.whiteOpacity) {
                this._uis.shape.attr({
                    'stroke-opacity': this._appearance.fillOpacity,
                    'stroke-width': 1 / window.cvat.player.geometry.scale,
                    'fill-opacity': this._appearance.fillOpacity
                });
            }
            else {
                this._uis.shape.attr({
                    'stroke-opacity': 1,
                    'stroke-width': STROKE_WIDTH / window.cvat.player.geometry.scale,
                    'fill-opacity': this._appearance.fillOpacity
                });
            }
        }

        if (this._uis.menu) {
            this._uis.menu.removeClass('highlightedUI');
        }
    }


    _removeShapeUI() {
        if (this._uis.shape) {
            this._uis.shape.remove();
            SVG.off(this._uis.shape.node);
            this._uis.shape = null;
        }
    }


    _removeShapeText() {
        if (this._uis.text) {
            this._uis.text.remove();
            SVG.off(this._uis.text.node);
            this._uis.text = null;
        }
    }


    _removeMenu() {
        if (this._uis.menu) {
            this._uis.menu.remove();
            this._uis.menu = null;
        }
    }


    _hideShapeText() {
        if (this._uis.text && this._uis.text.node.parentElement) {
            this._scenes.texts.node.removeChild(this._uis.text.node);
        }
    }


    _showShapeText() {
        if (!this._uis.text) {
            let frame = window.cvat.player.frames.current;
            this._drawShapeText(this._controller.interpolate(frame).attributes);
        }
        else if (!this._uis.text.node.parentElement) {
            this._scenes.texts.node.appendChild(this._uis.text.node);
        }

        this.updateShapeTextPosition();
    }


    _drawShapeText(attributes) {
        this._removeShapeText();
        if (this._uis.shape) {
            let id = this._controller.id;
            let label = ShapeView.labels()[this._controller.label];

            this._uis.text = this._scenes.texts.text((add) => {
                add.tspan(`${label.normalize()} ${id}`).style("text-transform", "uppercase");
                for (let attrId in attributes) {
                    let value = attributes[attrId].value != AAMUndefinedKeyword ?
                        attributes[attrId].value : '';
                    let name = attributes[attrId].name;
                    add.tspan(`${name}: ${value}`).attr({ dy: '1em', x: 0, attrId: attrId});
                }
            }).move(0, 0).addClass('shapeText bold');
        }
    }


    _highlightAttribute(attrId) {
        if (this._uis.text) {
            for (let tspan of this._uis.text.lines().members) {
                if (+tspan.attr('attrId') == +attrId) {
                    tspan.fill('red');
                }
                else tspan.fill('white');
            }
        }
    }


    _setupOccludedUI(occluded) {
        if (this._uis.shape) {
            if (occluded) {
                this._uis.shape.node.classList.add('occludedShape');
            }
            else {
                this._uis.shape.node.classList.remove('occludedShape');
            }
        }
    }


    _setupLockedUI(locked) {
        if (this._uis.changelabel) {
            this._uis.changelabel.disabled = locked;
        }

        if ('occlude' in this._uis.buttons) {
            this._uis.buttons.occlude.disabled = locked;
        }

        if ('keyframe' in this._uis.buttons) {
            this._uis.buttons.keyframe.disabled = locked;
        }

        if ('outside' in this._uis.buttons) {
            this._uis.buttons.outside.disabled = locked;
        }

        for (let attrId in this._uis.attributes) {
            let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
            let attribute = this._uis.attributes[attrId];
            if (attrInfo.type === 'radio') {
                for (let attrPart of attribute) {
                    attrPart.disabled = locked;
                }
            }
            else {
                attribute.disabled = locked;
            }
        }
    }


    _setupMergeView(merge) {
        if (this._uis.shape) {
            if (merge) {
                this._uis.shape.addClass('mergeShape');
            }
            else {
                this._uis.shape.removeClass('mergeShape');
            }
        }
    }


    _setupGroupView(group) {
        if (this._uis.shape) {
            if (group) {
                this._uis.shape.addClass('groupShape');
            }
            else {
                this._uis.shape.removeClass('groupShape');
            }
        }
    }


    _positionateMenus() {
        if (this._uis.menu) {
            this._scenes.menus.scrollTop(0);
            this._scenes.menus.scrollTop(this._uis.menu.offset().top - this._scenes.menus.offset().top);
        }
    }


    _drawMenu(outside) {
        let id = this._controller.id;
        let label = ShapeView.labels()[this._controller.label];
        let type = this._controller.type;
        let shortkeys = ShapeView.shortkeys();

        // Use native java script code because draw UI is performance bottleneck
        let UI = document.createElement('div');
        let titleBlock = makeTitleBlock.call(this, id, label, type, shortkeys);
        let buttonBlock = makeButtonBlock.call(this, type, outside, shortkeys);
        UI.appendChild(titleBlock);
        UI.appendChild(buttonBlock);

        if (!outside) {
            let changeLabelBlock = makeChangeLabelBlock.call(this, shortkeys);
            let attributesBlock = makeAttributesBlock.call(this, id);
            if (changeLabelBlock) {
                UI.appendChild(changeLabelBlock);
            }

            if (attributesBlock) {
                UI.appendChild(attributesBlock);
            }
        }

        UI.classList.add('uiElement', 'regular');
        UI.style.backgroundColor = this._controller.color.ui;

        this._uis.menu = $(UI);
        this._scenes.menus.prepend(this._uis.menu);

        function makeTitleBlock(id, label, type, shortkeys) {
            let title = document.createElement('div');

            let titleText = document.createElement('label');
            titleText.innerText = `${label} ${id} ` +
                `[${type.split('_')[1]}, ${type.split('_')[0]}]`;
            title.appendChild(titleText);
            title.classList.add('bold');
            title.style.marginRight = '32px';

            let deleteButton = document.createElement('a');
            deleteButton.classList.add('close');
            this._uis.buttons['delete'] = deleteButton;
            deleteButton.setAttribute('title', `
                ${shortkeys['delete_shape'].view_value} - ${shortkeys['delete_shape'].description}`);

            title.appendChild(titleText);
            title.appendChild(deleteButton);

            return title;
        }

        function makeButtonBlock(type, outside, shortkeys) {
            let buttonBlock = document.createElement('div');
            buttonBlock.appendChild(document.createElement('hr'));

            if (!outside) {
                let annotationCenter = document.createElement('center');

                let lockButton = document.createElement('button');
                lockButton.classList.add('graphicButton', 'lockButton');
                lockButton.setAttribute('title', `
                    ${shortkeys['switch_lock_property'].view_value} - ${shortkeys['switch_lock_property'].description}` + `\n` +
                    `${shortkeys['switch_all_lock_property'].view_value} - ${shortkeys['switch_all_lock_property'].description}`);

                let occludedButton = document.createElement('button');
                occludedButton.classList.add('graphicButton', 'occludedButton');
                occludedButton.setAttribute('title', `
                    ${shortkeys['switch_occluded_property'].view_value} - ${shortkeys['switch_occluded_property'].description}`);

                let copyButton = document.createElement('button');
                copyButton.classList.add('graphicButton', 'copyButton');
                copyButton.setAttribute('title', `
                    ${shortkeys['copy_shape'].view_value} - ${shortkeys['copy_shape'].description}` + `\n` +
                    `${shortkeys['switch_paste'].view_value} - ${shortkeys['switch_paste'].description}`);

                let propagateButton = document.createElement('button');
                propagateButton.classList.add('graphicButton', 'propagateButton');
                propagateButton.setAttribute('title', `
                    ${shortkeys['propagate_shape'].view_value} - ${shortkeys['propagate_shape'].description}`);

                let hiddenButton = document.createElement('button');
                hiddenButton.classList.add('graphicButton', 'hiddenButton');
                hiddenButton.setAttribute('title', `
                    ${shortkeys['switch_hide_mode'].view_value} - ${shortkeys['switch_hide_mode'].description}` + `\n` +
                    `${shortkeys['switch_all_hide_mode'].view_value} - ${shortkeys['switch_all_hide_mode'].description}`);

                annotationCenter.appendChild(lockButton);
                annotationCenter.appendChild(occludedButton);
                annotationCenter.appendChild(copyButton);
                annotationCenter.appendChild(propagateButton);
                annotationCenter.appendChild(hiddenButton);
                buttonBlock.appendChild(annotationCenter);

                this._uis.buttons['lock'] = lockButton;
                this._uis.buttons['occlude'] = occludedButton;
                this._uis.buttons['hide'] = hiddenButton;
                this._uis.buttons['copy'] = copyButton;
                this._uis.buttons['propagate'] = propagateButton;
            }

            if (type.split('_')[0] == 'interpolation') {
                let interpolationCenter = document.createElement('center');

                let outsideButton = document.createElement('button');
                outsideButton.classList.add('graphicButton', 'outsideButton');

                let keyframeButton = document.createElement('button');
                keyframeButton.classList.add('graphicButton', 'keyFrameButton');

                interpolationCenter.appendChild(outsideButton);
                interpolationCenter.appendChild(keyframeButton);

                this._uis.buttons['outside'] = outsideButton;
                this._uis.buttons['keyframe'] = keyframeButton;

                let prevKeyFrameButton = document.createElement('button');
                prevKeyFrameButton.classList.add('graphicButton', 'prevKeyFrameButton');
                prevKeyFrameButton.setAttribute('title', `
                    ${shortkeys['prev_key_frame'].view_value} - ${shortkeys['prev_key_frame'].description}`);

                let initKeyFrameButton = document.createElement('button');
                initKeyFrameButton.classList.add('graphicButton', 'initKeyFrameButton');

                let nextKeyFrameButton = document.createElement('button');
                nextKeyFrameButton.classList.add('graphicButton', 'nextKeyFrameButton');
                nextKeyFrameButton.setAttribute('title', `
                    ${shortkeys['next_key_frame'].view_value} - ${shortkeys['next_key_frame'].description}`);

                interpolationCenter.appendChild(prevKeyFrameButton);
                interpolationCenter.appendChild(initKeyFrameButton);
                interpolationCenter.appendChild(nextKeyFrameButton);
                buttonBlock.appendChild(interpolationCenter);

                this._uis.buttons['prevKeyFrame'] = prevKeyFrameButton;
                this._uis.buttons['initKeyFrame'] = initKeyFrameButton;
                this._uis.buttons['nextKeyFrame'] = nextKeyFrameButton;
            }

            return buttonBlock;
        }

        function makeChangeLabelBlock(shortkeys) {
            let labels = ShapeView.labels();
            if (Object.keys(labels).length > 1) {
                let block = document.createElement('div');

                let htmlLabel = document.createElement('label');
                htmlLabel.classList.add('semiBold');
                htmlLabel.innerText = 'Label: ';

                let select = document.createElement('select');
                select.classList.add('regular');
                for (let labelId in labels) {
                    let option = document.createElement('option');
                    option.setAttribute('value', labelId);
                    option.innerText = `${labels[labelId].normalize()}`;
                    select.add(option);
                }

                select.setAttribute('title', `
                    ${shortkeys['change_shape_label'].view_value} - ${shortkeys['change_shape_label'].description}`);

                block.appendChild(htmlLabel);
                block.appendChild(select);

                this._uis.changelabel = select;
                return block;
            }

            return null;
        }

        function makeAttributesBlock(objectId) {
            let attributes = window.cvat.labelsInfo.labelAttributes(this._controller.label);

            if (Object.keys(attributes).length) {
                let block = document.createElement('div');
                let htmlLabel = document.createElement('label');
                htmlLabel.classList.add('semiBold');
                htmlLabel.innerHTML = 'Attributes <br>';

                block.appendChild(htmlLabel);

                // Make it beaturiful. Group attributes by type:
                let attrByType = {};
                for (let attrId in attributes) {
                    let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
                    attrByType[attrInfo.type] = attrByType[attrInfo.type] || [];
                    attrByType[attrInfo.type].push(attrId);
                }

                let radios = attrByType['radio'] || [];
                let selects = attrByType['select'] || [];
                let texts = attrByType['text'] || [];
                let numbers = attrByType['number'] || [];
                let checkboxes = attrByType['checkbox'] || [];

                selects.sort((attrId_1, attrId_2) =>
                    attributes[attrId_1].normalize().length - attributes[attrId_2].normalize().length
                );
                texts.sort((attrId_1, attrId_2) =>
                    attributes[attrId_1].normalize().length - attributes[attrId_2].normalize().length
                );
                numbers.sort((attrId_1, attrId_2) =>
                    attributes[attrId_1].normalize().length - attributes[attrId_2].normalize().length
                );
                checkboxes.sort((attrId_1, attrId_2) =>
                    attributes[attrId_1].normalize().length - attributes[attrId_2].normalize().length
                );

                for (let attrId of [...radios, ...selects, ...texts, ...numbers, ...checkboxes]) {
                    let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
                    let htmlAttribute = makeAttribute.call(this, attrInfo, attrId, objectId);
                    htmlAttribute.classList.add('uiAttr');

                    block.appendChild(htmlAttribute);
                }

                return block;
            }

            return null;
        }

        function makeAttribute(attrInfo, attrId, objectId) {
            switch (attrInfo.type) {
            case 'checkbox':
                return makeCheckboxAttr.call(this, attrInfo, attrId, objectId);
            case 'select':
                return makeSelectAttr.call(this, attrInfo, attrId, objectId);
            case 'radio':
                return makeRadioAttr.call(this, attrInfo, attrId, objectId);
            case 'number':
                return makeNumberAttr.call(this, attrInfo, attrId, objectId);
            case 'text':
                return makeTextAttr.call(this, attrInfo, attrId, objectId);
            default:
                throw Error(`Unknown attribute type found: ${attrInfo.type}`);
            }
        }

        function makeCheckboxAttr(attrInfo, attrId, objectId) {
            let block = document.createElement('div');

            let checkbox = document.createElement('input');
            checkbox.setAttribute('type', 'checkbox');
            checkbox.setAttribute('id', `attr_${attrId}_of_${objectId}`);
            checkbox.setAttribute('attrId', attrId);

            let label = document.createElement('label');
            label.setAttribute('for', `attr_${attrId}_of_${objectId}`);
            label.innerText = `${attrInfo.name.normalize()}`;

            block.appendChild(checkbox);
            block.appendChild(label);

            this._uis.attributes[attrId] = checkbox;
            return block;
        }

        function makeSelectAttr(attrInfo, attrId) {
            let block = document.createElement('div');

            let select = document.createElement('select');
            select.setAttribute('attrId', attrId);
            select.classList.add('regular', 'selectAttr');
            for (let value of attrInfo.values) {
                let option = document.createElement('option');
                option.setAttribute('value', value);
                if (value === AAMUndefinedKeyword) {
                    option.innerText = '';
                }
                else {
                    option.innerText = value.normalize();
                }

                select.add(option);
            }

            let label = document.createElement('label');
            label.innerText = `${attrInfo.name.normalize()}: `;

            block.appendChild(label);
            block.appendChild(select);

            this._uis.attributes[attrId] = select;
            return block;
        }

        function makeRadioAttr(attrInfo, attrId, objectId) {
            let block = document.createElement('fieldset');

            let legend = document.createElement('legend');
            legend.innerText = `${attrInfo.name.normalize()}`;
            block.appendChild(legend);

            this._uis.attributes[attrId] = [];
            for (let idx = 0; idx < attrInfo.values.length; idx ++) {
                let value = attrInfo.values[idx];
                let wrapper = document.createElement('div');

                let label = document.createElement('label');
                label.setAttribute('for', `attr_${attrId}_of_${objectId}_${idx}`);

                if (value === AAMUndefinedKeyword) {
                    label.innerText = '';
                }
                else {
                    label.innerText = value.normalize();
                }

                let radio = document.createElement('input');
                radio.setAttribute('type', 'radio');
                radio.setAttribute('name', `attr_${attrId}_of_${objectId}`);
                radio.setAttribute('attrId', attrId);
                radio.setAttribute('value', value);
                radio.setAttribute('id', `attr_${attrId}_of_${objectId}_${idx}`);

                wrapper.appendChild(radio);
                wrapper.appendChild(label);
                block.appendChild(wrapper);

                this._uis.attributes[attrId].push(radio);
            }

            return block;
        }

        function makeNumberAttr(attrInfo, attrId) {
            let [min, max, step] = attrInfo.values;
            let block = document.createElement('div');

            let label = document.createElement('label');
            label.innerText = `${attrInfo.name.normalize()}: `;

            let number = document.createElement('input');
            number.setAttribute('type', 'number');
            number.setAttribute('step', `${step}`);
            number.setAttribute('min', `${min}`);
            number.setAttribute('max', `${max}`);
            number.classList.add('regular', 'numberAttr');

            let stopProp = function(e) {
                let key = e.keyCode;
                let serviceKeys = [37, 38, 39, 40, 13, 16, 9, 109];
                if (serviceKeys.includes(key)) {
                    e.preventDefault();
                    return;
                }
                e.stopPropagation();
            };
            number.onkeydown = stopProp;

            block.appendChild(label);
            block.appendChild(number);

            this._uis.attributes[attrId] = number;
            return block;
        }

        function makeTextAttr(attrInfo, attrId) {
            let block = document.createElement('div');

            let label = document.createElement('label');
            label.innerText = `${attrInfo.name.normalize()}: `;

            let text = document.createElement('input');
            text.setAttribute('type', 'text');
            text.classList.add('regular', 'textAttr');

            let stopProp = function(e) {
                let key = e.keyCode;
                let serviceKeys = [37, 38, 39, 40, 13, 16, 9, 109];
                if (serviceKeys.includes(key)) {
                    e.preventDefault();
                    return;
                }
                e.stopPropagation();
            };
            text.onkeydown = stopProp;

            block.appendChild(label);
            block.appendChild(text);

            this._uis.attributes[attrId] = text;
            return block;
        }
    }

    _drawShapeUI() {
        this._uis.shape.on('click', function() {
            this._positionateMenus();
            this._controller.click();
        }.bind(this));

        // Save view in order to have access to view in shapeGrouper (no such other methods to get it)
        this._uis.shape.node.cvatView = this;
    }


    _updateButtonsBlock(position) {
        let occluded = position.occluded;
        let outside = position.outside;
        let lock = this._controller.lock;
        let hiddenShape = this._controller.hiddenShape;
        let hiddenText = this._controller.hiddenText;
        let keyFrame = this._controller.isKeyFrame(window.cvat.player.frames.current);

        if ('occlude' in this._uis.buttons) {
            if (occluded) {
                this._uis.buttons.occlude.classList.add('occluded');
            }
            else {
                this._uis.buttons.occlude.classList.remove('occluded');
            }
            this._uis.buttons.occlude.disabled = lock;
        }

        if ('lock' in this._uis.buttons) {
            if (lock) {
                this._uis.buttons.lock.classList.add('locked');
            }
            else {
                this._uis.buttons.lock.classList.remove('locked');
            }
        }

        if ('hide' in this._uis.buttons) {
            if (hiddenShape) {
                this._uis.buttons.hide.classList.remove('hiddenText');
                this._uis.buttons.hide.classList.add('hiddenShape');
            }
            else if (hiddenText) {
                this._uis.buttons.hide.classList.add('hiddenText');
                this._uis.buttons.hide.classList.remove('hiddenShape');
            }
            else {
                this._uis.buttons.hide.classList.remove('hiddenText', 'hiddenShape');
            }
        }

        if ('outside' in this._uis.buttons) {
            if (outside) {
                this._uis.buttons.outside.classList.add('outside');
            }
            else {
                this._uis.buttons.outside.classList.remove('outside');
            }
        }

        if ('keyframe' in this._uis.buttons) {
            if (keyFrame) {
                this._uis.buttons.keyframe.classList.add('keyFrame');
            }
            else {
                this._uis.buttons.keyframe.classList.remove('keyFrame');
            }
        }
    }


    _updateMenuContent(interpolation) {
        let attributes = interpolation.attributes;
        for (let attrId in attributes) {
            if (attrId in this._uis.attributes) {
                let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
                if (attrInfo.type === 'radio') {
                    let idx = attrInfo.values.indexOf(attributes[attrId].value);
                    this._uis.attributes[attrId][idx].checked = true;
                }
                else if (attrInfo.type === 'checkbox') {
                    this._uis.attributes[attrId].checked = attributes[attrId].value;
                }
                else {
                    this._uis.attributes[attrId].value = attributes[attrId].value;
                }
            }
        }

        if (this._uis.changelabel) {
            this._uis.changelabel.value = this._controller.label;
        }

        this._updateButtonsBlock(interpolation.position);
    }


    _activateMenu() {
        if ('occlude' in this._uis.buttons) {
            this._uis.buttons.occlude.onclick = () => {
                this._controller.switchOccluded();
            };
        }

        if ('lock' in this._uis.buttons) {
            this._uis.buttons.lock.onclick = () => {
                this._controller.switchLock();
            };
        }

        if ('hide' in this._uis.buttons) {
            this._uis.buttons.hide.onclick = () => {
                this._controller.switchHide();
            };
        }

        if ('copy' in this._uis.buttons) {
            this._uis.buttons.copy.onclick = () => {
                Mousetrap.trigger(window.cvat.config.shortkeys['copy_shape'].value, 'keydown');
            };
        }

        if ('propagate' in this._uis.buttons) {
            this._uis.buttons.propagate.onclick = () => {
                Mousetrap.trigger(window.cvat.config.shortkeys['propagate_shape'].value, 'keydown');
            };
        }

        if ('delete' in this._uis.buttons) {
            this._uis.buttons.delete.onclick = (e) => this._controller.remove(e);
        }

        if ('outside' in this._uis.buttons) {
            this._uis.buttons.outside.onclick = () => {
                this._controller.switchOutside();
            };
        }

        if ('keyframe' in this._uis.buttons) {
            this._uis.buttons.keyframe.onclick = () => {
                this._controller.switchKeyFrame();
            };
        }

        if ('prevKeyFrame' in this._uis.buttons) {
            this._uis.buttons.prevKeyFrame.onclick = () => this._controller.prevKeyFrame();
        }

        if ('nextKeyFrame' in this._uis.buttons) {
            this._uis.buttons.nextKeyFrame.onclick = () => this._controller.nextKeyFrame();
        }

        if ('initKeyFrame' in this._uis.buttons) {
            this._uis.buttons.initKeyFrame.onclick = () => this._controller.initKeyFrame();
        }

        if (this._uis.changelabel) {
            this._uis.changelabel.onchange = (e) => this._controller.changeLabel(e.target.value);
        }

        this._uis.menu.on('mouseenter mousedown', (e) => {
            if (!window.cvat.mode && !e.ctrlKey) {
                this._controller.active = true;
            }
        });

        for (let attrId in this._uis.attributes) {
            let attrInfo = window.cvat.labelsInfo.attrInfo(attrId);
            switch (attrInfo.type) {
            case 'radio':
                for (let idx = 0; idx < this._uis.attributes[attrId].length; idx++) {
                    this._uis.attributes[attrId][idx].onchange = function(e) {
                        this._controller.updateAttribute(window.cvat.player.frames.current, attrId, e.target.value);
                    }.bind(this);
                }
                break;
            case 'checkbox':
                this._uis.attributes[attrId].onchange = function(e) {
                    this._controller.updateAttribute(window.cvat.player.frames.current, attrId, e.target.checked);
                }.bind(this);
                break;
            case 'number':
                this._uis.attributes[attrId].onchange = function(e) {
                    let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
                    e.target.value = value;
                    this._controller.updateAttribute(window.cvat.player.frames.current, attrId, value);
                }.bind(this);
                break;
            default:
                this._uis.attributes[attrId].onchange = function(e) {
                    this._controller.updateAttribute(window.cvat.player.frames.current, attrId, e.target.value);
                }.bind(this);
            }
        }
    }


    _updateColorForDots() {
        let color = this._appearance.fill || this._appearance.colors.shape;
        let scaledStroke = SELECT_POINT_STROKE_WIDTH / window.cvat.player.geometry.scale;
        $('.svg_select_points').each(function() {
            this.instance.fill(color);
            this.instance.stroke('black');
            this.instance.attr('stroke-width', scaledStroke);
        });
    }


    notify(newReason) {
        let oldReason = this._updateReason;
        this._updateReason = newReason;
        try {
            Listener.prototype.notify.call(this);
        }
        finally {
            this._updateReason = oldReason;
        }
    }


    // Inteface methods
    draw(interpolation) {
        let outside = interpolation.position.outside;

        if (!outside) {
            if (!this._controller.hiddenShape) {
                this._drawShapeUI(interpolation.position);
                this._setupOccludedUI(interpolation.position.occluded);
                this._setupMergeView(this._controller.merge);
                if (!this._controller.hiddenText) {
                    this._showShapeText();
                }
            }
        }

        this._drawMenu(outside);
        this._updateMenuContent(interpolation);
        this._activateMenu();
        this._setupLockedUI(this._controller.lock);
    }


    erase() {
        this._removeShapeUI();
        this._removeShapeText();
        this._removeMenu();
        this._uis.attributes = {};
        this._uis.buttons = {};
        this._uis.changelabel = null;
    }

    updateShapeTextPosition() {
        if (this._uis.shape && this._uis.shape.node.parentElement) {
            let scale = window.cvat.player.geometry.scale;
            if (this._appearance.whiteOpacity) {
                this._uis.shape.attr('stroke-width', 1 / scale);
            }
            else {
                this._uis.shape.attr('stroke-width', STROKE_WIDTH / scale);
            }

            if (this._uis.text && this._uis.text.node.parentElement) {
                let shapeBBox = window.cvat.translate.box.canvasToClient(this._scenes.svg.node, this._uis.shape.node.getBBox());
                let textBBox = this._uis.text.node.getBBox();

                let drawPoint = {
                    x: shapeBBox.x + shapeBBox.width + TEXT_MARGIN,
                    y: shapeBBox.y
                };

                const textContentScale = 10;
                if ((drawPoint.x + textBBox.width * textContentScale) > this._rightBorderFrame) {
                    drawPoint = {
                        x: shapeBBox.x + TEXT_MARGIN,
                        y: shapeBBox.y
                    };
                }

                let textPoint = window.cvat.translate.point.clientToCanvas(
                    this._scenes.texts.node,
                    drawPoint.x,
                    drawPoint.y
                );

                this._uis.text.move(textPoint.x, textPoint.y);

                for (let tspan of this._uis.text.lines().members) {
                    tspan.attr('x', this._uis.text.attr('x'));
                }
            }
        }
    }

    onShapeUpdate(model) {
        let interpolation = model.interpolate(window.cvat.player.frames.current);
        let activeAttribute = model.activeAttribute;
        let hiddenText = model.hiddenText && activeAttribute === null;
        let hiddenShape = model.hiddenShape && activeAttribute === null;

        if (this._flags.resizing || this._flags.dragging) {
            Logger.addEvent(Logger.EventType.debugInfo, {
                debugMessage: "Object has been updated during resizing/dragging",
                updateReason: model.updateReason,
            });
        }

        this._makeNotEditable();
        this._deselect();
        if (hiddenText) {
            this._hideShapeText();
        }

        switch (model.updateReason) {
        case 'activation':
            if (!model.active) {
                ShapeCollectionView.sortByZOrder();
            }
            break;
        case 'attributes':
            this._updateMenuContent(interpolation);
            setupHidden.call(this, hiddenShape, hiddenText,
                activeAttribute, model.active, interpolation);
            break;
        case 'merge':
            this._setupMergeView(model.merge);
            break;
        case 'groupping':
            this._setupGroupView(model.groupping);
            break;
        case 'lock': {
            let locked = model.lock;
            if (locked) {
                ShapeCollectionView.sortByZOrder();
            }

            this._setupLockedUI(locked);
            this._updateButtonsBlock(interpolation.position);
            this.notify('lock');
            break;
        }
        case 'occluded':
            this._setupOccludedUI(interpolation.position.occluded);
            this._updateButtonsBlock(interpolation.position);
            break;
        case 'hidden':
            setupHidden.call(this, hiddenShape, hiddenText,
                activeAttribute, model.active, interpolation);
            this._updateButtonsBlock(interpolation.position);
            this.notify('hidden');
            break;
        case 'remove':
            if (model.removed) {
                this.erase();
                this.notify('remove');
            }
            break;
        case 'position':
        case 'changelabel': {
            let idx = this._uis.menu.index();
            this._controller.model().unsubscribe(this);
            this.erase();
            this.draw(interpolation);
            this._controller.model().subscribe(this);
            this._uis.menu.detach();
            if (!idx) {
                this._uis.menu.prependTo(this._scenes.menus);
            }
            else {
                this._uis.menu.insertAfter(this._scenes.menus.find(`.uiElement:nth-child(${idx})`));
            }

            let colorByLabel = $('#colorByLabelRadio');
            if (colorByLabel.prop('checked')) {
                colorByLabel.trigger('change');
            }
            this.notify('changelabel');
            break;
        }
        case 'activeAttribute':
            setupHidden.call(this, hiddenShape, hiddenText,
                activeAttribute, model.active, interpolation);

            if (activeAttribute != null && this._uis.shape) {
                this._uis.shape.node.dispatchEvent(new Event('click'));
                this._highlightAttribute(activeAttribute);

                let attrInfo = window.cvat.labelsInfo.attrInfo(activeAttribute);
                if (attrInfo.type === 'text' || attrInfo.type === 'number') {
                    this._uis.attributes[activeAttribute].focus();
                    this._uis.attributes[activeAttribute].select();
                }
                else {
                    blurAllElements();
                }
            }
            else {
                this._highlightAttribute(null);
            }
            break;
        case 'color': {
            this._appearance.colors = model.color;
            this._applyColorSettings();
            this._updateColorForDots();
            break;
        }
        case 'z_order': {
            if (this._uis.shape) {
                this._uis.shape.attr('z_order', interpolation.position.z_order);
                ShapeCollectionView.sortByZOrder();
                return;
            }
            break;
        }
        case 'selection': {
            if (model.selected) {
                this._select();
            }
            else {
                this._deselect();
            }
            break;
        }
        }

        if (model.active || activeAttribute != null) {
            this._select();
            if (activeAttribute === null) {
                this._makeEditable();
            }
        }

        if (model.active || !hiddenText) {
            this._showShapeText();
        }

        function setupHidden(hiddenShape, hiddenText, attributeId, active, interpolation) {
            this._makeNotEditable();
            this._removeShapeUI();
            this._removeShapeText();

            if (!hiddenShape) {
                this._drawShapeUI(interpolation.position);
                this._setupOccludedUI(interpolation.position.occluded);
                if (!hiddenText || active) {
                    this._showShapeText();
                }

                if (active || attributeId != null) {
                    this._select();
                    if (attributeId === null) {
                        this._makeEditable();
                    }
                    else {
                        this._highlightAttribute(attributeId);
                    }
                }
            }
        }
    }

    _applyColorSettings() {
        if (this._uis.shape) {
            if (!this._uis.shape.hasClass('selectedShape')) {
                if (this._appearance.whiteOpacity) {
                    this._uis.shape.attr({
                        'stroke-opacity': this._appearance.fillOpacity,
                        'stroke-width': 1 / window.cvat.player.geometry.scale,
                        'fill-opacity': this._appearance.fillOpacity,
                    });
                }
                else {
                    this._uis.shape.attr({
                        'stroke-opacity': 1,
                        'stroke-width': STROKE_WIDTH / window.cvat.player.geometry.scale,
                        'fill-opacity': this._appearance.fillOpacity,
                    });
                }
            }

            this._uis.shape.attr({
                'stroke': this._appearance.stroke || this._appearance.colors.shape,
                'fill': this._appearance.fill || this._appearance.colors.shape,
            });
        }

        if (this._uis.menu) {
            this._uis.menu.css({
                'background-color': this._appearance.fill ? this._appearance.fill : this._appearance.colors.ui,
            });
        }
    }


    updateColorSettings(settings) {
        if ('white-opacity' in settings) {
            this._appearance.whiteOpacity = true;
            this._appearance.fillOpacity = settings['white-opacity'];
            this._appearance.fill = '#ffffff';
            this._appearance.stroke = '#ffffff';
        } else {
            this._appearance.whiteOpacity = false;
            delete this._appearance.stroke;
            delete this._appearance.fill;

            if ('fill-opacity' in settings) {
                this._appearance.fillOpacity = settings['fill-opacity'];
            }

            if (settings['color-by-group']) {
                let color = settings['colors-by-group'](this._controller.model().groupId);
                this._appearance.stroke = color;
                this._appearance.fill = color;
            }
            else if (settings['color-by-label']) {
                let color = settings['colors-by-label'](window.cvat.labelsInfo.labelColorIdx(this._controller.label));
                this._appearance.stroke = color;
                this._appearance.fill = color;
            }
        }

        if ('selected-fill-opacity' in settings) {
            this._appearance.selectedFillOpacity = settings['selected-fill-opacity'];
        }

        if (settings['black-stroke']) {
            this._appearance['stroke'] = 'black';
        }
        else if (!(settings['color-by-group'] || settings['color-by-label'] || settings['white-opacity'])) {
            delete this._appearance['stroke'];
        }

        this._applyColorSettings();
        if (this._flags.editable) {
            this._updateColorForDots();
        }
    }


    // Used by shapeCollectionView for select management
    get dragging() {
        return this._flags.dragging;
    }

    // Used by shapeCollectionView for resize management
    get resize() {
        return this._flags.resizing;
    }

    get updateReason() {
        return this._updateReason;
    }

    // Used in shapeGrouper in order to get model via controller and set group id
    controller() {
        return this._controller;
    }
}

ShapeView.shortkeys = function() {
    if (!ShapeView._shortkeys) {
        ShapeView._shortkeys = window.cvat.config.shortkeys;
    }
    return ShapeView._shortkeys;
};

ShapeView.labels = function() {
    if (!ShapeView._labels) {
        ShapeView._labels = window.cvat.labelsInfo.labels();
    }
    return ShapeView._labels;
};


class BoxView extends ShapeView {
    constructor(boxModel, boxController, svgScene, menusScene, textsScene) {
        super(boxModel, boxController, svgScene, menusScene, textsScene);

        this._uis.boxSize = null;
    }


    _makeEditable() {
        if (this._uis.shape && this._uis.shape.node.parentElement && !this._flags.editable) {
            if (!this._controller.lock) {
                this._uis.shape.on('resizestart', (e) => {
                    if (this._uis.boxSize) {
                        this._uis.boxSize.rm();
                        this._uis.boxSize = null;
                    }

                    this._uis.boxSize = drawBoxSize(this._scenes.svg, this._scenes.texts, e.target.getBBox());
                }).on('resizing', (e) => {
                    this._uis.boxSize = drawBoxSize.call(this._uis.boxSize, this._scenes.svg, this._scenes.texts, e.target.getBBox());
                }).on('resizedone', () => {
                    this._uis.boxSize.rm();
                });
            }
            ShapeView.prototype._makeEditable.call(this);
        }
    }

    _makeNotEditable() {
        if (this._uis.boxSize) {
            this._uis.boxSize.rm();
            this._uis.boxSize = null;
        }
        ShapeView.prototype._makeNotEditable.call(this);
    }


    _buildPosition() {
        let shape = this._uis.shape.node;
        return window.cvat.translate.box.canvasToActual({
            xtl: +shape.getAttribute('x'),
            ytl: +shape.getAttribute('y'),
            xbr: +shape.getAttribute('x') + +shape.getAttribute('width'),
            ybr: +shape.getAttribute('y') + +shape.getAttribute('height'),
            occluded: this._uis.shape.hasClass('occludedShape'),
            outside: false,    // if drag or resize possible, track is not outside
            z_order: +shape.getAttribute('z_order'),
        });
    }


    _drawShapeUI(position) {
        position = window.cvat.translate.box.actualToCanvas(position);
        let width = position.xbr - position.xtl;
        let height = position.ybr - position.ytl;

        this._uis.shape = this._scenes.svg.rect().size(width, height).attr({
            'fill': this._appearance.fill || this._appearance.colors.shape,
            'stroke': this._appearance.stroke || this._appearance.colors.shape,
            'stroke-width': STROKE_WIDTH /  window.cvat.player.geometry.scale,
            'z_order': position.z_order,
            'fill-opacity': this._appearance.fillOpacity
        }).move(position.xtl, position.ytl).addClass('shape');

        ShapeView.prototype._drawShapeUI.call(this);
    }
}


class PolyShapeView extends ShapeView {
    constructor(polyShapeModel, polyShapeController, svgScene, menusScene, textsScene) {
        super(polyShapeModel, polyShapeController, svgScene, menusScene, textsScene);
    }


    _buildPosition() {
        return {
            points: window.cvat.translate.points.canvasToActual(this._uis.shape.node.getAttribute('points')),
            occluded: this._uis.shape.hasClass('occludedShape'),
            outside: false,
            z_order: +this._uis.shape.node.getAttribute('z_order'),
        };
    }

    _makeEditable() {
        ShapeView.prototype._makeEditable.call(this);
        if (this._flags.editable) {
            for (let point of $('.svg_select_points')) {
                point = $(point);

                point.on('contextmenu.contextMenu', (e) => {
                    $('.custom-menu').hide(100);
                    this._pointContextMenu.attr('point_idx', point.index());
                    this._pointContextMenu.attr('dom_point_id', point.attr('id'));

                    this._pointContextMenu.finish().show(100);
                    let x = Math.min(e.pageX, this._rightBorderFrame - this._pointContextMenu[0].scrollWidth);
                    let y = Math.min(e.pageY, this._bottomBorderFrame - this._pointContextMenu[0].scrollHeight);
                    this._pointContextMenu.offset({
                        left: x,
                        top: y,
                    });

                    e.preventDefault();
                    e.stopPropagation();
                });

                point.on('dblclick.polyshapeEditor', (e) => {
                    if (this._controller.type === 'interpolation_points') {
                        // Not available for interpolation points
                        return;
                    }

                    if (e.shiftKey) {
                        if (!window.cvat.mode) {
                            // Get index before detach shape from DOM
                            let index = point.index();

                            // Make non active view and detach shape from DOM
                            this._makeNotEditable();
                            this._deselect();
                            if (this._controller.hiddenText) {
                                this._hideShapeText();
                            }
                            this._uis.shape.addClass('hidden');
                            if (this._uis.points) {
                                this._uis.points.addClass('hidden');
                            }

                            // Run edit mode
                            PolyShapeView.editor.edit(this._controller.type.split('_')[1],
                                this._uis.shape.attr('points'), this._color, index,
                                this._uis.shape.attr('points').split(/\s/)[index], e,
                                (points) => {
                                    this._uis.shape.removeClass('hidden');
                                    if (this._uis.points) {
                                        this._uis.points.removeClass('hidden');
                                    }
                                    if (points) {
                                        this._uis.shape.attr('points', points);
                                        this._controller.updatePosition(window.cvat.player.frames.current, this._buildPosition());
                                    }
                                },
                                this._controller.id
                            );
                        }
                    }
                    else {
                        this._controller.model().removePoint(point.index());
                    }
                    e.stopPropagation();
                });
            }
        }
    }


    _makeNotEditable() {
        for (let point of $('.svg_select_points')) {
            $(point).off('contextmenu.contextMenu');
            $(point).off('dblclick.polyshapeEditor');
        }
        ShapeView.prototype._makeNotEditable.call(this);
    }
}


class PolygonView extends PolyShapeView {
    constructor(polygonModel, polygonController, svgContent, UIContent, textsScene) {
        super(polygonModel, polygonController, svgContent, UIContent, textsScene);
    }

    _drawShapeUI(position) {
        let points = window.cvat.translate.points.actualToCanvas(position.points);
        this._uis.shape = this._scenes.svg.polygon(points).fill(this._appearance.colors.shape).attr({
            'fill': this._appearance.fill || this._appearance.colors.shape,
            'stroke': this._appearance.stroke || this._appearance.colors.shape,
            'stroke-width': STROKE_WIDTH / window.cvat.player.geometry.scale,
            'z_order': position.z_order,
            'fill-opacity': this._appearance.fillOpacity
        }).addClass('shape');

        ShapeView.prototype._drawShapeUI.call(this);
    }

    _makeEditable() {
        PolyShapeView.prototype._makeEditable.call(this);
        if (this._flags.editable && !this._controller.draggable) {
            this._uis.shape.draggable(false);
            this._uis.shape.style('cursor', 'default');
        }
    }

    onShapeUpdate(model) {
        ShapeView.prototype.onShapeUpdate.call(this, model);
        if (model.updateReason === 'draggable' && this._flags.editable) {
            if (model.draggable) {
                this._uis.shape.draggable();
            }
            else {
                this._uis.shape.draggable(false);
            }
        }
    }
}


class PolylineView extends PolyShapeView {
    constructor(polylineModel, polylineController, svgScene, menusScene, textsScene) {
        super(polylineModel, polylineController, svgScene, menusScene, textsScene);
    }


    _drawShapeUI(position) {
        let points = window.cvat.translate.points.actualToCanvas(position.points);
        this._uis.shape = this._scenes.svg.polyline(points).fill(this._appearance.colors.shape).attr({
            'stroke': this._appearance.stroke || this._appearance.colors.shape,
            'stroke-width': STROKE_WIDTH / window.cvat.player.geometry.scale,
            'z_order': position.z_order,
        }).addClass('shape polyline');

        ShapeView.prototype._drawShapeUI.call(this);
    }

    _setupMergeView(merge) {
        if (this._uis.shape) {
            if (merge) {
                this._uis.shape.addClass('mergeLine');
            }
            else {
                this._uis.shape.removeClass('mergeLine');
            }
        }
    }


    _setupGroupView(group) {
        if (this._uis.shape) {
            if (group) {
                this._uis.shape.addClass('groupLine');
            }
            else {
                this._uis.shape.removeClass('groupLine');
            }
        }
    }


    _deselect() {
        ShapeView.prototype._deselect.call(this);

        if (this._appearance.whiteOpacity) {
            if (this._uis.shape) {
                this._uis.shape.attr({
                    'visibility': 'hidden'
                });
            }
        }
    }

    _applyColorSettings() {
        ShapeView.prototype._applyColorSettings.call(this);
        if (this._appearance.whiteOpacity) {
            if (this._uis.shape) {
                this._uis.shape.attr({
                    'visibility': 'hidden'
                });
            }
        }
        else {
            if (this._uis.shape) {
                this._uis.shape.attr({
                    'visibility': 'visible'
                });
            }
        }
    }
}


class PointsView extends PolyShapeView {
    constructor(pointsModel, pointsController, svgScene, menusScene, textsScene) {
        super(pointsModel, pointsController, svgScene, menusScene, textsScene);
        this._uis.points = null;
    }


    _setupMergeView(merge) {
        if (this._uis.points) {
            if (merge) {
                this._uis.points.addClass('mergePoints');
            }
            else {
                this._uis.points.removeClass('mergePoints');
            }
        }
    }


    _setupGroupView(group) {
        if (this._uis.points) {
            if (group) {
                this._uis.points.addClass('groupPoints');
            }
            else {
                this._uis.points.removeClass('groupPoints');
            }
        }
    }


    _drawPointMarkers(position) {
        if (this._uis.points || position.outside) {
            return;
        }

        this._uis.points = this._scenes.svg.group()
            .fill(this._appearance.fill || this._appearance.colors.shape)
            .on('click', () => {
                this._positionateMenus();
                this._controller.click();
            }).addClass('pointTempGroup');

        this._uis.points.node.setAttribute('z_order', position.z_order);

        let points = PolyShapeModel.convertStringToNumberArray(position.points);
        for (let point of points) {
            let radius = POINT_RADIUS * 2 / window.cvat.player.geometry.scale;
            let scaledStroke = STROKE_WIDTH / window.cvat.player.geometry.scale;
            this._uis.points.circle(radius).move(point.x - radius / 2, point.y - radius / 2)
                .fill('inherit').stroke('black').attr('stroke-width', scaledStroke).addClass('tempMarker');
        }
    }


    _removePointMarkers() {
        if (this._uis.points) {
            this._uis.points.off('click');
            this._uis.points.remove();
            this._uis.points = null;
        }
    }


    _makeEditable() {
        PolyShapeView.prototype._makeEditable.call(this);
        if (!this._controller.lock) {
            $('.svg_select_points').on('click', () => this._positionateMenus());
            this._removePointMarkers();
        }
    }


    _makeNotEditable() {
        PolyShapeView.prototype._makeNotEditable.call(this);
        if (!this._controller.hiddenShape) {
            let interpolation = this._controller.interpolate(window.cvat.player.frames.current);
            if (interpolation.position.points) {
                let points = window.cvat.translate.points.actualToCanvas(interpolation.position.points);
                this._drawPointMarkers(Object.assign(interpolation.position, {points: points}));
            }
        }
    }


    _drawShapeUI(position) {
        let points = window.cvat.translate.points.actualToCanvas(position.points);
        this._uis.shape = this._scenes.svg.polyline(points).addClass('shape points').attr({
            'z_order': position.z_order,
        });
        this._drawPointMarkers(Object.assign(position, {points: points}));
        ShapeView.prototype._drawShapeUI.call(this);
    }


    _removeShapeUI() {
        ShapeView.prototype._removeShapeUI.call(this);
        this._removePointMarkers();
    }


    _deselect() {
        ShapeView.prototype._deselect.call(this);

        if (this._appearance.whiteOpacity) {
            if (this._uis.points) {
                this._uis.points.attr({
                    'visibility': 'hidden'
                });
            }

            if (this._uis.shape) {
                this._uis.shape.attr({
                    'visibility': 'hidden'
                });
            }
        }
    }

    _applyColorSettings() {
        ShapeView.prototype._applyColorSettings.call(this);

        if (this._appearance.whiteOpacity) {
            if (this._uis.points) {
                this._uis.points.attr({
                    'visibility': 'hidden'
                });
            }

            if (this._uis.shape) {
                this._uis.shape.attr({
                    'visibility': 'hidden'
                });
            }
        }
        else {
            if (this._uis.points) {
                this._uis.points.attr({
                    'visibility': 'visible',
                    'fill': this._appearance.fill || this._appearance.colors.shape,
                });
            }

            if (this._uis.shape) {
                this._uis.shape.attr({
                    'visibility': 'visible',
                });
            }
        }
    }
}

function buildShapeModel(data, type, clientID, color) {
    switch (type) {
    case 'interpolation_box':
    case 'annotation_box':
    case 'interpolation_box_by_4_points':
    case 'annotation_box_by_4_points':
        // convert type into 'box' if 'box_by_4_points'
        type = type.replace('_by_4_points', '');
        return new BoxModel(data, type, clientID, color);
    case 'interpolation_points':
    case 'annotation_points':
        return new PointsModel(data, type, clientID, color);
    case 'interpolation_polyline':
    case 'annotation_polyline':
        return new PolylineModel(data, type, clientID, color);
    case 'interpolation_polygon':
    case 'annotation_polygon':
        return new PolygonModel(data, type, clientID, color);
    }
    throw Error('Unreacheable code was reached.');
}


function buildShapeController(shapeModel) {
    switch (shapeModel.type) {
    case 'interpolation_box':
    case 'annotation_box':
        return new BoxController(shapeModel);
    case 'interpolation_points':
    case 'annotation_points':
        return new PointsController(shapeModel);
    case 'interpolation_polyline':
    case 'annotation_polyline':
        return new PolylineController(shapeModel);
    case 'interpolation_polygon':
    case 'annotation_polygon':
        return new PolygonController(shapeModel);
    }
    throw Error('Unreacheable code was reached.');
}


function buildShapeView(shapeModel, shapeController, svgContent, UIContent, textsContent) {
    switch (shapeModel.type) {
    case 'interpolation_box':
    case 'annotation_box':
        return new BoxView(shapeModel, shapeController, svgContent, UIContent, textsContent);
    case 'interpolation_points':
    case 'annotation_points':
        return new PointsView(shapeModel, shapeController, svgContent, UIContent, textsContent);
    case 'interpolation_polyline':
    case 'annotation_polyline':
        return new PolylineView(shapeModel, shapeController, svgContent, UIContent, textsContent);
    case 'interpolation_polygon':
    case 'annotation_polygon':
        return new PolygonView(shapeModel, shapeController, svgContent, UIContent, textsContent);
    }
    throw Error('Unreacheable code was reached.');
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeCollectionModel ShapeCollectionController ShapeCollectionView */

/* global
    buildShapeController:false
    buildShapeModel:false
    buildShapeView:false
    copyToClipboard:false
    FilterController:false
    FilterModel:false
    FilterView:false
    Listener:false
    Logger:false
    Mousetrap:false
    POINT_RADIUS:false
    SELECT_POINT_STROKE_WIDTH:false
    ShapeSplitter:false
    STROKE_WIDTH:false
    SVG:false
*/

"use strict";

class ShapeCollectionModel extends Listener {
    constructor() {
        super('onCollectionUpdate', () => this);
        this._annotationShapes = {};
        this._groups = {};
        this._interpolationShapes = [];
        this._shapes = [];
        this._showAllInterpolation = false;
        this._currentShapes = [];
        this._idx = 0;
        this._groupIdx = 0;
        this._frame = null;
        this._activeShape = null;
        this._flush = false;
        this._lastPos = {
            x: 0,
            y: 0,
        };
        this._z_order =  {
            max: 0,
            min: 0,
        };
        this._colors = [
            "#0066FF", "#AF593E", "#01A368", "#FF861F", "#ED0A3F", "#FF3F34", "#76D7EA",
            "#8359A3", "#FBE870", "#C5E17A", "#03BB85", "#FFDF00", "#8B8680", "#0A6B0D",
            "#8FD8D8", "#A36F40", "#F653A6", "#CA3435", "#FFCBA4", "#FF99CC", "#FA9D5A",
            "#FFAE42", "#A78B00", "#788193", "#514E49", "#1164B4", "#F4FA9F", "#FED8B1",
            "#C32148", "#01796F", "#E90067", "#FF91A4", "#404E5A", "#6CDAE7", "#FFC1CC",
            "#006A93", "#867200", "#E2B631", "#6EEB6E", "#FFC800", "#CC99BA", "#FF007C",
            "#BC6CAC", "#DCCCD7", "#EBE1C2", "#A6AAAE", "#B99685", "#0086A7", "#5E4330",
            "#C8A2C8", "#708EB3", "#BC8777", "#B2592D", "#497E48", "#6A2963", "#E6335F",
            "#00755E", "#B5A895", "#0048ba", "#EED9C4", "#C88A65", "#FF6E4A", "#87421F",
            "#B2BEB5", "#926F5B", "#00B9FB", "#6456B7", "#DB5079", "#C62D42", "#FA9C44",
            "#DA8A67", "#FD7C6E", "#93CCEA", "#FCF686", "#503E32", "#FF5470", "#9DE093",
            "#FF7A00", "#4F69C6", "#A50B5E", "#F0E68C", "#FDFF00", "#F091A9", "#FFFF66",
            "#6F9940", "#FC74FD", "#652DC1", "#D6AEDD", "#EE34D2", "#BB3385", "#6B3FA0",
            "#33CC99", "#FFDB00", "#87FF2A", "#6EEB6E", "#FFC800", "#CC99BA", "#7A89B8",
            "#006A93", "#867200", "#E2B631", "#D9D6CF"
        ];

        this._colorIdx = 0;
        this._filter = new FilterModel(() => this.update());
        this._splitter = new ShapeSplitter();
    }

    _nextGroupIdx() {
        return ++this._groupIdx;
    }

    nextColor() {
        // Step used for more color variability
        let idx = ++this._colorIdx % this._colors.length;
        let color = this._colors[idx];

        return {
            shape: color,
            ui: color,
        };
    }

    _computeInterpolation(frame) {
        let interpolated = [];
        for (let shape of (this._annotationShapes[frame] || []).concat(this._interpolationShapes) ) {
            if (!shape.removed) {
                let interpolation = shape.interpolate(frame);
                if (!interpolation.position.outside || shape.isKeyFrame(frame) ||
                    (shape.type.split('_')[0] === 'interpolation' && this._showAllInterpolation)) {
                    interpolated.push({
                        model: shape,
                        interpolation: shape.interpolate(frame),
                    });
                }
            }
        }

        return interpolated;
    }

    _clear() {
        this._z_order.max = 0;
        this._z_order.min = 0;

        if (this._activeShape) {
            if (this._activeShape.activeAttribute != null) {
                this._activeShape.activeAttribute = null;
            }
            this.resetActive();
        }

        this._currentShapes = [];
    }

    _interpolate() {
        this._clear();
        this._currentShapes = this._computeInterpolation(this._frame);
        for (let shape of this._currentShapes) {
            let z_order = shape.interpolation.position.z_order;
            if (z_order > this._z_order.max) {
                this._z_order.max = z_order;
            }
            if (z_order < this._z_order.min) {
                this._z_order.min = z_order;
            }
        }

        this._currentShapes = this._filter.filter(this._currentShapes);
        this.notify();
    }

    _removeFromGroup(elem) {
        let groupId = elem.groupId;

        // Check if elem in group
        if (groupId) {
            if (groupId in this._groups) {
                // Remove from group
                let idx = this._groups[groupId].indexOf(elem);
                if (idx != -1) {
                    this._groups[groupId].splice(idx, 1);
                }

                // Now remove group if it empty
                if (!this._groups[groupId].length) {
                    delete this._groups[groupId];
                }
            }
            elem.groupId = 0;
        }
    }

    // Common code for switchActiveOccluded(), switchActiveKeyframe(), switchActiveLock() and switchActiveOutside()
    _selectActive() {
        let shape = null;
        if (this._activeAAMShape) {
            shape = this._activeAAMShape;
        }
        else {
            this.selectShape(this._lastPos, false);
            if (this._activeShape) {
                shape = this._activeShape;
            }
        }

        return shape;
    }

    cleanupClientObjects() {
        for (const shape of this._shapes) {
            if (typeof (shape.serverID) === 'undefined') {
                shape.removed = true;
            }
        }

        this.notify();
    }

    colorsByGroup(groupId) {
        // If group id of shape is 0 (default value), then shape not contained in a group
        if (!groupId) {
            return '#ffffff';
        }

        return this._colors[groupId % this._colors.length];
    }

    joinToGroup(elements) {
        let groupIdx = this._nextGroupIdx();
        this._groups[groupIdx] = [];

        for (let elem of elements) {
            // Clear old group
            this._removeFromGroup(elem);
            this._groups[groupIdx].push(elem);
            elem.groupId = groupIdx;
        }
    }

    resetGroupFor(elements) {
        for (let elem of elements) {
            this._removeFromGroup(elem);
        }
    }

    updateGroupIdx(groupId) {
        if (groupId in this._groups) {
            const newGroupId = this._nextGroupIdx();
            this._groups[newGroupId] = this._groups[groupId];
            delete this._groups[groupId];
            for (const elem of this._groups[newGroupId]) {
                elem.groupId = newGroupId;
            }
        }
    }

    import(data) {
        function _convertShape(shape) {
            if (shape.type === 'rectangle') {
                Object.assign(shape, window.cvat.translate.box.serverToClient(shape));
                delete shape.points;
                shape.type = 'box';
            } else {
                Object.assign(shape, window.cvat.translate.points.serverToClient(shape));
            }

            for (const attr of shape.attributes) {
                attr.id = attr.spec_id;
                delete attr.spec_id;
            }
        }

        // Make copy of data in order to don't affect original data
        data = JSON.parse(JSON.stringify(data));

        for (const imported of data.shapes.concat(data.tracks)) {
            // Conversion from client object format to server object format
            if (imported.shapes) {
                for (const attr of imported.attributes) {
                    attr.id = attr.spec_id;
                    delete attr.spec_id;
                }

                for (const shape of imported.shapes) {
                    _convertShape(shape);
                }
                this.add(imported, `interpolation_${imported.shapes[0].type}`);
            } else {
                _convertShape(imported);
                this.add(imported, `annotation_${imported.type}`);
            }
        }

        this.notify();
        return this;
    }

    export() {
        function _convertShape(shape) {
            if (shape.type === 'box') {
                Object.assign(shape, window.cvat.translate.box.clientToServer(shape));
                shape.type = 'rectangle';
                delete shape.xtl;
                delete shape.ytl;
                delete shape.xbr;
                delete shape.ybr;
            } else {
                Object.assign(shape, window.cvat.translate.points.clientToServer(shape));
            }

            for (const attr of shape.attributes) {
                attr.spec_id = attr.id;
                delete attr.id;
            }
        }

        const data = {
            shapes: [],
            tracks: [],
        };

        const mapping = [];

        for (let shape of this._shapes) {
            if (!shape.removed) {
                const exported = shape.export();
                // Conversion from client object format to server object format
                if (exported.shapes) {
                    for (let attr of exported.attributes) {
                        attr.spec_id = attr.id;
                        delete attr.id;
                    }

                    for (let shape of exported.shapes) {
                        _convertShape(shape);
                    }
                } else {
                    _convertShape(exported);
                }

                if (shape.type.split('_')[0] === 'annotation') {
                    data.shapes.push(exported);
                } else {
                    data.tracks.push(exported);
                }

                mapping.push([exported, shape]);
            }
        }

        return [data, mapping];
    }

    find(direction) {
        if (Math.sign(direction) > 0) {
            let frame = this._frame + 1;
            while (frame <= window.cvat.player.frames.stop) {
                let shapes = this._computeInterpolation(frame);
                shapes = this._filter.filter(shapes);
                if (shapes.length) {
                    return frame;
                }
                frame ++;
            }
        }
        else {
            let frame = this._frame - 1;
            while (frame >= window.cvat.player.frames.start) {
                let shapes = this._computeInterpolation(frame);
                shapes = this._filter.filter(shapes);
                if (shapes.length) {
                    return frame;
                }
                frame --;
            }
        }
        return null;
    }

    zOrder(frame) {
        if (frame === this._frame) {
            this._z_order.max ++;
            this._z_order.min --;
            return {
                max: this._z_order.max,
                min: this._z_order.min,
            };
        }
        else {
            let interpolation = this._computeInterpolation(frame);
            let max = 0;
            let min = 0;
            for (let shape of interpolation) {
                let z_order = shape.interpolation.position.z_order;
                if (z_order > max) {
                    max = z_order;
                }
                if (z_order < min) {
                    min = z_order;
                }
            }
            return {
                max: max + 1,
                min: min - 1,
            };
        }
    }

    empty() {
        this._flush = true;
        this._annotationShapes = {};
        this._interpolationShapes = [];
        this._shapes = [];
        this._idx = 0;
        this._colorIdx = 0;
        this._interpolate();
    }

    add(data, type) {
        this._idx += 1;
        const id = this._idx;
        const model = buildShapeModel(data, type, id, this.nextColor());
        if (type.startsWith('interpolation')) {
            this._interpolationShapes.push(model);
        } else {
            this._annotationShapes[model.frame] = this._annotationShapes[model.frame] || [];
            this._annotationShapes[model.frame].push(model);
        }
        this._shapes.push(model);
        model.subscribe(this);

        // Update collection groups & group index
        const groupIdx = model.groupId;
        this._groupIdx = Math.max(this._groupIdx, groupIdx);
        if (groupIdx) {
            this._groups[groupIdx] = this._groups[groupIdx] || [];
            this._groups[groupIdx].push(model);
        }
        return model;
    }

    selectShape(pos, noActivation) {
        let closedShape = {
            minDistance: Number.MAX_SAFE_INTEGER,
            shape: null,
        };

        let openShape = {
            minDistance: 5 / window.cvat.player.geometry.scale,
            shape: null,
        };

        for (let shape of this._currentShapes) {
            if (shape.model.hiddenShape) continue;
            if (shape.model.removed) continue;
            switch (shape.model.type.split('_')[1]) {
            case 'box':
            case 'polygon':
                if (shape.model.contain(pos, this._frame)) {
                    let distance = shape.model.distance(pos, this._frame);
                    if (distance < closedShape.minDistance) {
                        closedShape.minDistance = distance;
                        closedShape.shape = shape.model;
                    }
                }
                break;
            case 'polyline':
            case 'points': {
                let distance = shape.model.distance(pos, this._frame);
                if (distance < openShape.minDistance) {
                    openShape.minDistance = distance;
                    openShape.shape = shape.model;
                }
                break;
            }
            }
        }

        let active = closedShape.shape;
        if (openShape.shape) {
            active = openShape.shape;
        }

        if (noActivation) {
            return active;
        }

        if (active && active != this._activeShape) {
            if (this._activeShape) {
                this._activeShape.active = false;
                this._activeShape = null;
            }
            this._activeShape = active;
            this._activeShape.active = true;
        }
    }

    update() {
        this._interpolate();
    }

    resetActive() {
        if (this._activeShape) {
            this._activeShape.active = false;
            this._activeShape = null;
        }
    }

    onPlayerUpdate(player) {
        if (player.ready()) {
            let frame = player.frames.current;

            // If frame was not changed and collection already interpolated (for example after pause() call)
            if (frame === this._frame && this._currentShapes.length) return;

            if (this._activeShape) {
                if (this._activeShape.activeAttribute != null) {
                    this._activeShape.activeAttribute = null;
                }
                this.resetActive();
            }

            this._frame = frame;
            this._interpolate();
            if (!window.cvat.mode) {
                this.selectShape(this._lastPos, false);
            }
        }
        else {
            this._clear();
            this.notify();
        }
    }

    onShapeUpdate(model) {
        switch (model.updateReason) {
        case 'activeAttribute':
            if (model.activeAttribute != null) {
                if (this._activeShape && this._activeShape != model) {
                    this.resetActive();
                }
                this._activeShape = model;
            }
            else if (this._activeShape) {
                this.resetActive();
            }
            break;
        case 'activation': {
            let active = model.active;
            if (active) {
                if (this._activeShape != model) {
                    if (this._activeShape) {
                        this._activeShape.active = false;
                        // Now loop occure -> active(false) -> notify -> onShapeUpdate
                        // But it will go on 'else' branch and this._activeShape will set to null
                    }
                    this._activeShape = model;
                }
            }
            else {
                if (this._activeShape === model) {
                    this._activeShape = null;
                }
            }
            break;
        }
        case 'remove':
            if (model.removed) {
                if (this._activeShape === model) {
                    this._activeShape = null;
                }
                break;
            }
            this.update();
            break;
        case 'keyframe':
        case 'outside':
            this.update();
            break;
        }
    }

    onShapeCreatorUpdate(shapeCreator) {
        if (shapeCreator.createMode) {
            this.resetActive();
        }
    }

    collectStatistic() {
        let statistic = {};
        let labels = window.cvat.labelsInfo.labels();
        for (let labelId in labels) {
            statistic[labelId] = {
                boxes: {
                    annotation: 0,
                    interpolation: 0,
                },
                polygons: {
                    annotation: 0,
                    interpolation: 0,
                },
                polylines: {
                    annotation: 0,
                    interpolation: 0,
                },
                points: {
                    annotation: 0,
                    interpolation: 0,
                },
                manually: 0,
                interpolated: 0,
                total: 0,
            };
        }

        let totalForLabels = {
            boxes: {
                annotation: 0,
                interpolation: 0,
            },
            polygons: {
                annotation: 0,
                interpolation: 0,
            },
            polylines: {
                annotation: 0,
                interpolation: 0,
            },
            points: {
                annotation: 0,
                interpolation: 0,
            },
            manually: 0,
            interpolated: 0,
            total: 0,
        };

        for (let shape of this._shapes) {
            if (shape.removed) continue;
            let statShape = shape.collectStatistic();
            statistic[statShape.labelId].manually += statShape.manually;
            statistic[statShape.labelId].interpolated += statShape.interpolated;
            statistic[statShape.labelId].total += statShape.total;
            switch (statShape.type) {
            case 'box':
                statistic[statShape.labelId].boxes[statShape.mode] ++;
                break;
            case 'polygon':
                statistic[statShape.labelId].polygons[statShape.mode] ++;
                break;
            case 'polyline':
                statistic[statShape.labelId].polylines[statShape.mode] ++;
                break;
            case 'points':
                statistic[statShape.labelId].points[statShape.mode] ++;
                break;
            default:
                throw Error(`Unknown shape type found: ${statShape.type}`);
            }
        }

        for (let labelId in labels) {
            totalForLabels.boxes.annotation += statistic[labelId].boxes.annotation;
            totalForLabels.boxes.interpolation += statistic[labelId].boxes.interpolation;
            totalForLabels.polygons.annotation += statistic[labelId].polygons.annotation;
            totalForLabels.polygons.interpolation += statistic[labelId].polygons.interpolation;
            totalForLabels.polylines.annotation += statistic[labelId].polylines.annotation;
            totalForLabels.polylines.interpolation += statistic[labelId].polylines.interpolation;
            totalForLabels.points.annotation += statistic[labelId].points.annotation;
            totalForLabels.points.interpolation += statistic[labelId].points.interpolation;
            totalForLabels.manually += statistic[labelId].manually;
            totalForLabels.interpolated += statistic[labelId].interpolated;
            totalForLabels.total += statistic[labelId].total;
        }

        return [statistic, totalForLabels];
    }

    switchActiveLock() {
        let shape = this._selectActive();

        if (shape) {
            shape.switchLock();
            Logger.addEvent(Logger.EventType.lockObject, {
                count: 1,
                value: !shape.lock
            });
        }
    }

    switchObjectsLock(labelId) {
        this.resetActive();
        let value = true;

        let shapes = Number.isInteger(labelId) ? this._currentShapes.filter((el) => el.model.label === labelId) : this._currentShapes;
        for (let shape of shapes) {
            if (shape.model.removed) continue;
            value = value && shape.model.lock;
            if (!value) break;
        }

        Logger.addEvent(Logger.EventType.lockObject, {
            count: this._currentShapes.length,
            value: !value,
        });

        for (let shape of shapes) {
            if (shape.model.removed) continue;
            if (shape.model.lock === value) {
                shape.model.switchLock();
            }
        }
    }

    switchActiveOccluded() {
        let shape = this._selectActive();
        if (shape && !shape.lock) {
            shape.switchOccluded(window.cvat.player.frames.current);
        }
    }

    switchActiveKeyframe() {
        let shape = this._selectActive();
        if (shape && shape.type === 'interpolation_box' && !shape.lock) {
            shape.switchKeyFrame(window.cvat.player.frames.current);
        }
    }

    switchActiveOutside() {
        let shape = this._selectActive();
        if (shape && shape.type === 'interpolation_box' && !shape.lock) {
            shape.switchOutside(window.cvat.player.frames.current);
        }
    }

    switchActiveHide() {
        let shape = this._selectActive();
        if (shape) {
            shape.switchHide();
        }
    }

    switchObjectsHide(labelId) {
        this.resetActive();
        let hiddenShape = true;
        let hiddenText = true;

        let shapes = Number.isInteger(labelId) ? this._shapes.filter((el) => el.label === labelId) : this._shapes;
        for (let shape of shapes) {
            if (shape.removed) continue;
            hiddenShape = hiddenShape && shape.hiddenShape;

            if (!hiddenShape) {
                break;
            }
        }

        if (!hiddenShape) {
            // any shape visible
            for (let shape of shapes) {
                if (shape.removed) continue;
                hiddenText = hiddenText && shape.hiddenText;

                if (!hiddenText) {
                    break;
                }
            }

            if (!hiddenText) {
                // any shape text visible
                for (let shape of shapes) {
                    if (shape.removed) continue;
                    while (shape.hiddenShape || !shape.hiddenText) {
                        shape.switchHide();
                    }
                }
            }
            else {
                // all shape text invisible
                for (let shape of shapes) {
                    if (shape.removed) continue;
                    while (!shape.hiddenShape) {
                        shape.switchHide();
                    }
                }
            }
        }
        else {
            // all shapes invisible
            for (let shape of shapes) {
                if (shape.removed) continue;
                while (shape.hiddenShape || shape.hiddenText) {
                    shape.switchHide();
                }
            }
        }
    }

    removePointFromActiveShape(idx) {
        if (this._activeShape && !this._activeShape.lock) {
            this._activeShape.removePoint(idx);
        }
    }

    split() {
        if (this._activeShape) {
            if (!this._activeShape.lock && this._activeShape.type.split('_')[0] === 'interpolation') {
                let list = this._splitter.split(this._activeShape, this._frame);
                let type = this._activeShape.type;
                for (let item of list) {
                    this.add(item, type);
                }

                // Undo/redo code
                let newShapes = this._shapes.slice(-list.length);
                let originalShape = this._activeShape;
                window.cvat.addAction('Split Object', () => {
                    for (let shape of newShapes) {
                        shape.removed = true;
                        shape.unsubscribe(this);
                    }
                    originalShape.removed = false;
                }, () => {
                    for (let shape of newShapes) {
                        shape.removed = false;
                        shape.subscribe(this);
                    }
                    originalShape.removed = true;
                    this.update();
                }, this._frame);
                // End of undo/redo code

                this._activeShape.removed = true;
                this.update();
            }
        }
    }

    selectAllWithLabel(labelId) {
        for (let shape of this.currentShapes) {
            if (shape.model.label === labelId) {
                shape.model.select();
            }
        }
    }

    deselectAll() {
        for (let shape of this.currentShapes) {
            shape.model.deselect();
        }
    }

    get flush() {
        return this._flush;
    }

    set flush(value) {
        this._flush = value;
    }

    get activeShape() {
        return this._activeShape;
    }

    get currentShapes() {
        return this._currentShapes;
    }

    get lastPosition() {
        return this._lastPos;
    }

    set lastPosition(pos) {
        this._lastPos = pos;
    }

    set showAllInterpolation(value) {
        this._showAllInterpolation = value;
        this.update();
    }

    get filter() {
        return this._filter;
    }

    get shapes() {
        return this._shapes;
    }

    get maxId() {
        return Math.max(-1, ...this._shapes.map( shape => shape.id ));
    }
}

class ShapeCollectionController {
    constructor(collectionModel) {
        this._model = collectionModel;
        this._filterController = new FilterController(collectionModel.filter);
        setupCollectionShortcuts.call(this);

        function setupCollectionShortcuts() {
            let switchLockHandler = Logger.shortkeyLogDecorator(function() {
                this.switchActiveLock();
            }.bind(this));

            let switchAllLockHandler = Logger.shortkeyLogDecorator(function() {
                this.switchAllLock();
            }.bind(this));

            let switchOccludedHandler = Logger.shortkeyLogDecorator(function() {
                this.switchActiveOccluded();
            }.bind(this));

            let switchActiveKeyframeHandler = Logger.shortkeyLogDecorator(function() {
                this.switchActiveKeyframe();
            }.bind(this));

            let switchActiveOutsideHandler = Logger.shortkeyLogDecorator(function() {
                this.switchActiveOutside();
            }.bind(this));

            let switchHideHandler = Logger.shortkeyLogDecorator(function() {
                this.switchActiveHide();
            }.bind(this));

            let switchAllHideHandler = Logger.shortkeyLogDecorator(function() {
                this.switchAllHide();
            }.bind(this));

            let removeActiveHandler = Logger.shortkeyLogDecorator(function(e) {
                this.removeActiveShape(e);
            }.bind(this));

            let switchLabelHandler = Logger.shortkeyLogDecorator(function(e) {
                let activeShape = this._model.activeShape;
                if (activeShape) {
                    let labels = Object.keys(window.cvat.labelsInfo.labels());
                    let key = e.keyCode - '1'.charCodeAt(0);
                    if (key in labels) {
                        let labelId = +labels[key];
                        activeShape.changeLabel(labelId);
                    }
                }
                e.preventDefault();
            }.bind(this));

            let switchDefaultLabelHandler = Logger.shortkeyLogDecorator(function(e) {
                $('#shapeLabelSelector option').eq(e.keyCode - '1'.charCodeAt(0)).prop('selected', true);
                $('#shapeLabelSelector').trigger('change');
            });

            let changeShapeColorHandler = Logger.shortkeyLogDecorator(function() {
                this.switchActiveColor();
            }.bind(this));

            let incZHandler = Logger.shortkeyLogDecorator(function() {
                if (window.cvat.mode === null) {
                    let activeShape = this._model.activeShape;
                    if (activeShape) {
                        activeShape.z_order = this._model.zOrder(window.cvat.player.frames.current).max;
                    }
                }
            }.bind(this));

            let decZHandler = Logger.shortkeyLogDecorator(function() {
                if (window.cvat.mode === null) {
                    let activeShape = this._model.activeShape;
                    if (activeShape) {
                        activeShape.z_order = this._model.zOrder(window.cvat.player.frames.current).min;
                    }
                }
            }.bind(this));

            let nextShapeType = Logger.shortkeyLogDecorator(function(e) {
                if (window.cvat.mode === null) {
                    let next = $('#shapeTypeSelector option:selected').next();
                    if (!next.length) {
                        next = $('#shapeTypeSelector option').first();
                    }

                    next.prop('selected', true);
                    next.trigger('change');
                }
            }.bind(this));

            let prevShapeType = Logger.shortkeyLogDecorator(function(e) {
                if (window.cvat.mode === null) {
                    let prev = $('#shapeTypeSelector option:selected').prev();
                    if (!prev.length) {
                        prev = $('#shapeTypeSelector option').last();
                    }

                    prev.prop('selected', true);
                    prev.trigger('change');
                }
            }.bind(this));

            let shortkeys = window.cvat.config.shortkeys;
            Mousetrap.bind(shortkeys["switch_lock_property"].value, switchLockHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_all_lock_property"].value, switchAllLockHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_occluded_property"].value, switchOccludedHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_active_keyframe"].value, switchActiveKeyframeHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_active_outside"].value, switchActiveOutsideHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_hide_mode"].value, switchHideHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["switch_all_hide_mode"].value, switchAllHideHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["change_default_label"].value, switchDefaultLabelHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["change_shape_label"].value, switchLabelHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["delete_shape"].value, removeActiveHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["change_shape_color"].value, changeShapeColorHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys['next_shape_type'].value, nextShapeType.bind(this), 'keydown');
            Mousetrap.bind(shortkeys['prev_shape_type'].value, prevShapeType.bind(this), 'keydown');


            if (window.cvat.job.z_order) {
                Mousetrap.bind(shortkeys["inc_z"].value, incZHandler.bind(this), 'keydown');
                Mousetrap.bind(shortkeys["dec_z"].value, decZHandler.bind(this), 'keydown');
            }
        }
    }

    switchActiveOccluded() {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchActiveOccluded();
        }
    }

    switchActiveKeyframe() {
        if (!window.cvat.mode) {
            this._model.switchActiveKeyframe();
        }
    }

    switchActiveOutside() {
        if (!window.cvat.mode) {
            this._model.switchActiveOutside();
        }
    }

    switchAllLock() {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchObjectsLock();
        }
    }

    switchLabelLock(labelId) {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchObjectsLock(labelId);
        }
    }

    switchActiveLock() {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchActiveLock();
        }
    }

    switchAllHide() {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchObjectsHide();
        }
    }

    switchLabelHide(lableId) {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchObjectsHide(lableId);
        }
    }

    switchActiveHide() {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            this._model.switchActiveHide();
        }
    }

    switchActiveColor() {
        if (!window.cvat.mode || window.cvat.mode === 'aam') {
            const colorByInstanceInput = $('#colorByInstanceRadio');
            const colorByGroupInput = $('#colorByGroupRadio');
            const colorByLabelInput = $('#colorByLabelRadio');

            const { activeShape } = this._model;
            if (activeShape) {
                if (colorByInstanceInput.prop('checked')) {
                    activeShape.changeColor(this._model.nextColor());
                } else if (colorByGroupInput.prop('checked')) {
                    if (activeShape.groupId) {
                        this._model.updateGroupIdx(activeShape.groupId);
                        colorByGroupInput.trigger('change');
                    }
                } else {
                    const labelId = +activeShape.label;
                    window.cvat.labelsInfo.updateLabelColorIdx(labelId);
                    $(`.labelContentElement[label_id="${labelId}"`).css('background-color',
                        this._model.colorsByGroup(window.cvat.labelsInfo.labelColorIdx(labelId)));
                    colorByLabelInput.trigger('change');
                }
            }
        }
    }

    switchDraggableForActive() {
        let activeShape = this._model.activeShape;
        if (activeShape && typeof(activeShape.draggable) != 'undefined') {
            activeShape.draggable = !activeShape.draggable;
        }
    }

    removeActiveShape(e) {
        if (window.cvat.mode === null) {
            this._model.selectShape(this._model.lastPosition, false);
            let activeShape = this._model.activeShape;
            if (activeShape && (!activeShape.lock || e && e.shiftKey)) {
                activeShape.remove();
            }
        }
    }

    removePointFromActiveShape(idx) {
        this._model.removePointFromActiveShape(idx);
    }

    splitForActive() {
        this._model.split();
    }

    selectShape(pos, noActivation) {
        this._model.selectShape(pos, noActivation);
    }

    resetActive() {
        this._model.resetActive();
    }

    setLastPosition(pos) {
        this._model.lastPosition = pos;
    }

    setShowAllInterpolation(value) {
        this._model.showAllInterpolation = value;
    }

    colorsByGroup(groupId) {
        return this._model.colorsByGroup(groupId);
    }

    get filterController() {
        return this._filterController;
    }

    get activeShape() {
        return this._model.activeShape;
    }
}

class ShapeCollectionView {
    constructor(collectionModel, collectionController) {
        collectionModel.subscribe(this);
        this._controller = collectionController;
        this._frameBackground = $('#frameBackground');
        this._frameContent = SVG.adopt($('#frameContent')[0]);
        this._textContent = SVG.adopt($('#frameText')[0]);
        this._UIContent = $('#uiContent');
        this._labelsContent = $('#labelsContent');
        this._showAllInterpolationBox = $('#showAllInterBox');
        this._fillOpacityRange = $('#fillOpacityRange');
        this._selectedFillOpacityRange = $('#selectedFillOpacityRange');
        this._blackStrokeCheckbox = $('#blackStrokeCheckbox');
        this._colorByInstanceRadio = $('#colorByInstanceRadio');
        this._colorByGroupRadio = $('#colorByGroupRadio');
        this._colorByLabelRadio = $('#colorByLabelRadio');
        this._colorByGroupCheckbox = $('#colorByGroupCheckbox');
        this._filterView = new FilterView(this._controller.filterController);
        this._currentViews = [];

        this._currentModels = [];
        this._frameMarker = null;

        this._activeShapeUI = null;
        this._scale = 1;
        this._rotation = 0;
        this._colorSettings = {
            "fill-opacity": 0
        };

        this._showAllInterpolationBox.on('change', (e) => {
            this._controller.setShowAllInterpolation(e.target.checked);
        });

        this._fillOpacityRange.on('input', (e) => {
            let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            e.target.value = value;
            if (value >= 0) {
                this._colorSettings["fill-opacity"] = value;
                delete this._colorSettings['white-opacity'];

                for (let view of this._currentViews) {
                    view.updateColorSettings(this._colorSettings);
                }
            }
            else {
                value *= -1;
                this._colorSettings["white-opacity"] = value;

                for (let view of this._currentViews) {
                    view.updateColorSettings(this._colorSettings);
                }
            }
        });

        this._selectedFillOpacityRange.on('input', (e) => {
            let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            e.target.value = value;
            this._colorSettings["selected-fill-opacity"] = value;

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._blackStrokeCheckbox.on('click', (e) => {
            this._colorSettings["black-stroke"] = e.target.checked;

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._colorByInstanceRadio.on('change', () => {
            this._colorSettings['color-by-group'] = false;
            this._colorSettings['color-by-label'] = false;

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._colorByGroupRadio.on('change', () => {
            this._colorSettings['color-by-group'] = true;
            this._colorSettings['color-by-label'] = false;
            this._colorSettings['colors-by-group'] = this._controller.colorsByGroup.bind(this._controller);

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._colorByLabelRadio.on('change', () => {
            this._colorSettings['color-by-label'] = true;
            this._colorSettings['color-by-group'] = false;

            this._colorSettings['colors-by-label'] = this._controller.colorsByGroup.bind(this._controller);

            for (let view of this._currentViews) {
                view.updateColorSettings(this._colorSettings);
            }
        });

        this._frameContent.on('mousedown', (e) => {
            if (e.target === this._frameContent.node) {
                this._controller.resetActive();
            }
        });

        $('#playerFrame').on('mouseleave', () => {
            if (!window.cvat.mode) {
                this._controller.resetActive();
            }
        });

        this._frameContent.on('mousemove', function(e) {
            if (e.ctrlKey || e.which === 2 || e.target.classList.contains('svg_select_points')) {
                return;
            }

            let frameHeight = window.cvat.player.geometry.frameHeight;
            let frameWidth = window.cvat.player.geometry.frameWidth;
            let pos = window.cvat.translate.point.clientToCanvas(this._frameBackground[0], e.clientX, e.clientY);
            if (pos.x >= 0 && pos.y >= 0 && pos.x <= frameWidth && pos.y <= frameHeight) {
                if (!window.cvat.mode) {
                    this._controller.selectShape(pos, false);
                }

                this._controller.setLastPosition(pos);
            }
        }.bind(this));

        $('#shapeContextMenu li').click((e) => {
            $('.custom-menu').hide(100);

            switch($(e.target).attr("action")) {
            case "object_url": {
                let active = this._controller.activeShape;
                if (active) {
                    if (typeof active.serverID !== 'undefined') {
                        window.cvat.search.set('frame', window.cvat.player.frames.current);
                        window.cvat.search.set('filter', `*[serverID="${active.serverID}"]`);
                        copyToClipboard(window.cvat.search.toString());
                        window.cvat.search.set('frame', null);
                        window.cvat.search.set('filter', null);
                    } else {
                        showMessage('First save job in order to get static object URL');
                    }
                }
                break;
            }
            case "change_color":
                this._controller.switchActiveColor();
                break;
            case "remove_shape":
                this._controller.removeActiveShape();
                break;
            case "switch_occluded":
                this._controller.switchActiveOccluded();
                break;
            case "switch_lock":
                this._controller.switchActiveLock();
                break;
            case "split_track":
                this._controller.splitForActive();
                break;
            case "drag_polygon":
                this._controller.switchDraggableForActive();
                break;
            }
        });

        let shortkeys = window.cvat.config.shortkeys;
        for (let button of $('#shapeContextMenu li')) {
            switch(button.getAttribute('action')) {
            case "change_color":
                button.innerText = `Change Color (${shortkeys['change_shape_color'].view_value})`;
                break;
            case "remove_shape":
                button.innerText = `Remove Shape (${shortkeys['delete_shape'].view_value})`;
                break;
            case "switch_occluded":
                button.innerText = `Switch Occluded (${shortkeys['switch_occluded_property'].view_value})`;
                break;
            case "switch_lock":
                button.innerText = `Switch Lock (${shortkeys['switch_lock_property'].view_value})`;
                break;
            }
        }

        $('#pointContextMenu li').click((e) => {
            let menu = $('#pointContextMenu');
            let idx = +menu.attr('point_idx');
            $('.custom-menu').hide(100);

            switch($(e.target).attr("action")) {
            case "remove_point":
                this._controller.removePointFromActiveShape(idx);
                break;
            }
        });

        let labels = window.cvat.labelsInfo.labels();
        for (let labelId in labels) {
            let lockButton = $(`<button> </button>`)
                .addClass('graphicButton lockButton')
                .attr('title', 'Switch lock for all object with same label')
                .on('click', () => {
                    this._controller.switchLabelLock(+labelId);
                });

            lockButton[0].updateState = function(button, labelId) {
                let models = this._currentModels.filter((el) => el.label === labelId);
                let locked = true;
                for (let model of models) {
                    locked = locked && model.lock;
                    if (!locked) {
                        break;
                    }
                }

                if (!locked) {
                    button.removeClass('locked');
                }
                else {
                    button.addClass('locked');
                }
            }.bind(this, lockButton, +labelId);

            let hiddenButton = $(`<button> </button>`)
                .addClass('graphicButton hiddenButton')
                .attr('title', 'Switch hide for all object with same label')
                .on('click', () => {
                    this._controller.switchLabelHide(+labelId);
                });

            hiddenButton[0].updateState = function(button, labelId) {
                let models = this._currentModels.filter((el) => el.label === labelId);
                let hiddenShape = true;
                let hiddenText = true;
                for (let model of models) {
                    hiddenShape = hiddenShape && model.hiddenShape;
                    hiddenText = hiddenText && model.hiddenText;
                    if (!hiddenShape && !hiddenText) {
                        break;
                    }
                }

                if (hiddenShape) {
                    button.removeClass('hiddenText');
                    button.addClass('hiddenShape');
                }
                else if (hiddenText) {
                    button.addClass('hiddenText');
                    button.removeClass('hiddenShape');
                }
                else {
                    button.removeClass('hiddenText hiddenShape');
                }
            }.bind(this, hiddenButton, +labelId);

            let buttonBlock = $('<center> </center>')
                .append(lockButton).append(hiddenButton)
                .addClass('buttonBlockOfLabelUI');

            let title = $(`<label> ${labels[labelId]} </label>`);

            let mainDiv = $('<div> </div>').addClass('labelContentElement h2 regular hidden')
                .css({
                    'background-color': collectionController.colorsByGroup(+window.cvat.labelsInfo.labelColorIdx(+labelId)),
                }).attr({
                    'label_id': labelId,
                }).on('mouseover mouseup', () => {
                    mainDiv.addClass('highlightedUI');
                    collectionModel.selectAllWithLabel(+labelId);
                }).on('mouseout mousedown', () => {
                    mainDiv.removeClass('highlightedUI');
                    collectionModel.deselectAll();
                }).append(title).append(buttonBlock);

            mainDiv[0].updateState = function() {
                lockButton[0].updateState();
                hiddenButton[0].updateState();
            };

            this._labelsContent.append(mainDiv);
        }

        let sidePanelObjectsButton = $('#sidePanelObjectsButton');
        let sidePanelLabelsButton = $('#sidePanelLabelsButton');

        sidePanelObjectsButton.on('click', () => {
            sidePanelObjectsButton.addClass('activeTabButton');
            sidePanelLabelsButton.removeClass('activeTabButton');
            this._UIContent.removeClass('hidden');
            this._labelsContent.addClass('hidden');
        });

        sidePanelLabelsButton.on('click', () => {
            sidePanelLabelsButton.addClass('activeTabButton');
            sidePanelObjectsButton.removeClass('activeTabButton');
            this._labelsContent.removeClass('hidden');
            this._UIContent.addClass('hidden');
        });
    }

    _updateLabelUIs() {
        this._labelsContent.find('.labelContentElement').addClass('hidden');
        let labels = new Set(this._currentModels.map((el) => el.label));
        for (let label of labels) {
            this._labelsContent.find(`.labelContentElement[label_id="${label}"]`).removeClass('hidden');
        }
        this._updateLabelUIsState();
    }

    _updateLabelUIsState() {
        for (let labelUI of this._labelsContent.find('.labelContentElement:not(.hidden)')) {
            labelUI.updateState();
        }
    }

    onCollectionUpdate(collection) {
        // Save parents and detach elements from DOM
        // in order to increase performance in the buildShapeView function
        let parents = {
            uis: this._UIContent.parent(),
            shapes: this._frameContent.node.parentNode
        };

        let oldModels = this._currentModels;
        let oldViews = this._currentViews;
        let newShapes = collection.currentShapes;
        let newModels = newShapes.map((el) => el.model);

        const frameChanged = this._frameMarker !== window.cvat.player.frames.current;
        this._scale = window.cvat.player.geometry.scale;

        if (frameChanged) {
            this._frameContent.node.parent = null;
            this._UIContent.detach();
        }

        this._currentViews = [];
        this._currentModels = [];

        // Check which old models are new models
        for (let oldIdx = 0; oldIdx < oldModels.length; oldIdx ++) {
            let newIdx = newModels.indexOf(oldModels[oldIdx]);
            let significantUpdate = ['remove', 'keyframe', 'outside'].includes(oldModels[oldIdx].updateReason);

            // Changed frame means a changed position in common case. We need redraw it.
            // If shape has been restored after removing, it view already removed. We need redraw it.
            if (newIdx === -1 || significantUpdate || frameChanged) {
                let view = oldViews[oldIdx];
                view.unsubscribe(this);
                view.controller().model().unsubscribe(view);
                view.erase();

                if (newIdx != -1 && (frameChanged || significantUpdate)) {
                    drawView.call(this, newShapes[newIdx], newModels[newIdx]);
                }
            }
            else {
                this._currentViews.push(oldViews[oldIdx]);
                this._currentModels.push(oldModels[oldIdx]);
            }
        }

        // Now we need draw new models which aren't on previous collection
        for (let newIdx = 0; newIdx < newModels.length; newIdx ++) {
            if (!this._currentModels.includes(newModels[newIdx])) {
                drawView.call(this, newShapes[newIdx], newModels[newIdx]);
            }
        }

        if (frameChanged) {
            parents.shapes.append(this._frameContent.node);
            parents.uis.prepend(this._UIContent);
        }

        ShapeCollectionView.sortByZOrder();
        this._frameMarker = window.cvat.player.frames.current;
        this._updateLabelUIs();

        function drawView(shape, model) {
            let view = buildShapeView(model, buildShapeController(model), this._frameContent, this._UIContent, this._textContent);
            view.draw(shape.interpolation);
            view.updateColorSettings(this._colorSettings);
            model.subscribe(view);
            view.subscribe(this);
            this._currentViews.push(view);
            this._currentModels.push(model);
        }
    }

    onPlayerUpdate(player) {
        if (!player.ready())  this._frameContent.addClass('hidden');
        else this._frameContent.removeClass('hidden');

        let geometry = player.geometry;
        if (this._rotation != geometry.rotation) {
            this._rotation = geometry.rotation;
            this._controller.resetActive();
        }

        if (this._scale === geometry.scale) return;

        this._scale = player.geometry.scale;
        let scaledR = POINT_RADIUS / this._scale;
        let scaledStroke = STROKE_WIDTH / this._scale;
        let scaledPointStroke = SELECT_POINT_STROKE_WIDTH / this._scale;
        $('.svg_select_points').each(function() {
            this.instance.radius(scaledR, scaledR);
            this.instance.attr('stroke-width', scaledPointStroke);
        });

        $('.tempMarker').each(function() {
            this.instance.radius(scaledR, scaledR);
            this.instance.attr('stroke-width', scaledStroke);
        });

        for (let view of this._currentViews) {
            view.updateShapeTextPosition();
        }
    }

    onShapeViewUpdate(view) {
        switch (view.updateReason) {
        case 'drag':
            if (view.dragging) {
                window.cvat.mode = 'drag';
            }
            else if (window.cvat.mode === 'drag') {
                window.cvat.mode = null;
            }
            break;
        case 'resize':
            if (view.resize) {
                window.cvat.mode = 'resize';
            }
            else if (window.cvat.mode === 'resize') {
                window.cvat.mode = null;
            }
            break;
        case 'remove': {
            let idx = this._currentViews.indexOf(view);
            view.unsubscribe(this);
            view.controller().model().unsubscribe(view);
            view.erase();
            this._currentViews.splice(idx, 1);
            this._currentModels.splice(idx, 1);
            this._updateLabelUIs();
            break;
        }
        case 'changelabel': {
            this._updateLabelUIs();
            break;
        }
        case 'lock':
            this._updateLabelUIsState();
            break;
        case 'hidden':
            this._updateLabelUIsState();
            break;
        }
    }

    // If ShapeGrouperModel was disabled, need to update shape appearence
    // In order to don't dublicate function, I simulate checkbox change event
    onGrouperUpdate(grouper) {
        if (!grouper.active && this._colorByGroupRadio.prop('checked')) {
            this._colorByGroupRadio.trigger('change');
        }
    }

    static sortByZOrder() {
        if (window.cvat.job.z_order) {
            let content = $('#frameContent');
            let shapes = $(content.find('.shape, .pointTempGroup, .shapeCreation, .aim').toArray().sort(
                (a,b) => (+a.attributes.z_order.nodeValue - +b.attributes.z_order.nodeValue)
            ));
            let children = content.children().not(shapes);

            for (let shape of shapes) {
                content.append(shape);
            }

            for (let child of children) {
                content.append(child);
            }
        }
    }

}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported PlayerModel PlayerController PlayerView */

/* global
    blurAllElements:false
    copyToClipboard:false
    Listener:false
    Logger:false
    Mousetrap:false
*/

'use strict';

class FrameProvider extends Listener {
    constructor(stop, tid) {
        super('onFrameLoad', () => this._loaded);
        this._MAX_LOAD = 500;

        this._stack = [];
        this._loadInterval = null;
        this._required = null;
        this._loaded = null;
        this._loadAllowed = true;
        this._preloadRunned = false;
        this._loadCounter = this._MAX_LOAD;
        this._frameCollection = {};
        this._stop = stop;
        this._tid = tid;
    }

    require(frame) {
        if (frame in this._frameCollection) {
            this._preload(frame);
            return this._frameCollection[frame];
        }
        this._required = frame;
        this._loadCounter = this._MAX_LOAD;
        this._load();
        return null;
    }

    _onImageLoad(image, frame) {
        const next = frame + 1;
        if (next <= this._stop && this._loadCounter > 0) {
            this._stack.push(next);
        }
        this._loadCounter--;
        this._loaded = frame;
        this._frameCollection[frame] = image;
        this._loadAllowed = true;
        image.onload = null;
        image.onerror = null;
        this.notify();
    }

    _preload(frame) {
        if (this._preloadRunned) {
            return;
        }

        const last = Math.min(this._stop, frame + Math.ceil(this._MAX_LOAD / 2));
        if (!(last in this._frameCollection)) {
            for (let idx = frame + 1; idx <= last; idx++) {
                if (!(idx in this._frameCollection)) {
                    this._loadCounter = this._MAX_LOAD - (idx - frame);
                    this._stack.push(idx);
                    this._preloadRunned = true;
                    this._load();
                    return;
                }
            }
        }
    }

    _load() {
        if (!this._loadInterval) {
            this._loadInterval = setInterval(() => {
                if (!this._loadAllowed) {
                    return;
                }

                if (this._loadCounter <= 0) {
                    this._stack = [];
                }

                if (!this._stack.length && this._required == null) {
                    clearInterval(this._loadInterval);
                    this._preloadRunned = false;
                    this._loadInterval = null;
                    return;
                }

                if (this._required != null) {
                    this._stack.push(this._required);
                    this._required = null;
                }

                const frame = this._stack.pop();
                if (frame in this._frameCollection) {
                    this._loadCounter--;
                    const next = frame + 1;
                    if (next <= this._stop && this._loadCounter > 0) {
                        this._stack.push(frame + 1);
                    }
                    return;
                }

                // If load up to last frame, no need to load previous frames from stack
                if (frame === this._stop) {
                    this._stack = [];
                }

                this._loadAllowed = false;
                const image = new Image();
                image.onload = this._onImageLoad.bind(this, image, frame);
                image.onerror = () => {
                    this._loadAllowed = true;
                    image.onload = null;
                    image.onerror = null;
                };
                image.src = `/api/v1/tasks/${this._tid}/frames/${frame}`;
            }, 25);
        }
    }
}


const MAX_PLAYER_SCALE = 10;
const MIN_PLAYER_SCALE = 0.1;

class PlayerModel extends Listener {
    constructor(task, playerSize) {
        super('onPlayerUpdate', () => this);
        this._frame = {
            start: window.cvat.player.frames.start,
            stop: window.cvat.player.frames.stop,
            current: window.cvat.player.frames.current,
            previous: null,
        };

        this._settings = {
            multipleStep: 10,
            fps: 25,
            rotateAll: task.mode === 'interpolation',
            resetZoom: task.mode === 'annotation',
        };

        this._playInterval = null;
        this._pauseFlag = null;
        this._frameProvider = new FrameProvider(this._frame.stop, task.id);
        this._continueAfterLoad = false;
        this._continueTimeout = null;

        this._geometry = {
            scale: 1,
            left: 0,
            top: 0,
            width: playerSize.width,
            height: playerSize.height,
            frameOffset: 0,
            rotation: 0,
        };
        this._framewiseRotation = {};
        const frameOffset = Math.max((playerSize.height - MIN_PLAYER_SCALE) / MIN_PLAYER_SCALE,
            (playerSize.width - MIN_PLAYER_SCALE) / MIN_PLAYER_SCALE);
        this._geometry.frameOffset = Math.floor(frameOffset);
        window.cvat.translate.playerOffset = this._geometry.frameOffset;
        window.cvat.player.rotation = this._geometry.rotation;

        this._frameProvider.subscribe(this);
    }

    get frames() {
        return {
            start: this._frame.start,
            stop: this._frame.stop,
            current: this._frame.current,
            previous: this._frame.previous,
        };
    }

    get geometry() {
        const copy = Object.assign({}, this._geometry);
        copy.rotation = this._settings.rotateAll ? this._geometry.rotation
            : this._framewiseRotation[this._frame.current] || 0;
        return copy;
    }

    get playing() {
        return this._playInterval != null;
    }

    get image() {
        return this._frameProvider.require(this._frame.current);
    }

    get resetZoom() {
        return this._settings.resetZoom;
    }

    get multipleStep() {
        return this._settings.multipleStep;
    }

    get rotateAll() {
        return this._settings.rotateAll;
    }

    set rotateAll(value) {
        this._settings.rotateAll = value;

        if (!value) {
            this._geometry.rotation = 0;
        } else {
            this._framewiseRotation = {};
        }

        this.fit();
    }

    set fps(value) {
        this._settings.fps = value;
    }

    set multipleStep(value) {
        this._settings.multipleStep = value;
    }

    set resetZoom(value) {
        this._settings.resetZoom = value;
    }

    ready() {
        return this._frame.previous === this._frame.current;
    }

    onFrameLoad(last) { // callback for FrameProvider instance
        if (last === this._frame.current) {
            if (this._continueTimeout) {
                clearTimeout(this._continueTimeout);
                this._continueTimeout = null;
            }

            // If need continue playing after load, set timeout for additional frame download
            if (this._continueAfterLoad) {
                this._continueTimeout = setTimeout(() => {
                    // If you still need to play, start it
                    this._continueTimeout = null;
                    if (this._continueAfterLoad) {
                        this._continueAfterLoad = false;
                        this.play();
                    } else { // Else update the frame
                        this.shift(0);
                    }
                }, 5000);
            } else { // Just update frame if no need to play
                this.shift(0);
            }
        }
    }

    play() {
        this._pauseFlag = false;
        this._playInterval = setInterval(() => {
            if (this._pauseFlag) { // pause method without notify (for frame downloading)
                if (this._playInterval) {
                    clearInterval(this._playInterval);
                    this._playInterval = null;
                }
                return;
            }

            const skip = Math.max(Math.floor(this._settings.fps / 25), 1);
            if (!this.shift(skip)) this.pause(); // if not changed, pause
        }, 1000 / this._settings.fps);
    }

    pause() {
        if (this._playInterval) {
            clearInterval(this._playInterval);
            this._playInterval = null;
            this._pauseFlag = true;
            this.notify();
        }
    }

    updateGeometry(geometry) {
        this._geometry.width = geometry.width;
        this._geometry.height = geometry.height;
    }

    shift(delta, absolute) {
        if (['resize', 'drag'].indexOf(window.cvat.mode) !== -1) {
            return false;
        }

        this._continueAfterLoad = false; // default reset continue
        this._frame.current = Math.clamp(absolute ? delta : this._frame.current + delta,
            this._frame.start,
            this._frame.stop);
        const frame = this._frameProvider.require(this._frame.current);
        if (!frame) {
            this._continueAfterLoad = this.playing;
            this._pauseFlag = true;
            this.notify();
            return false;
        }

        window.cvat.player.frames.current = this._frame.current;
        window.cvat.player.geometry.frameWidth = frame.width;
        window.cvat.player.geometry.frameHeight = frame.height;

        Logger.addEvent(Logger.EventType.changeFrame, {
            from: this._frame.previous,
            to: this._frame.current,
        });

        const changed = this._frame.previous !== this._frame.current;
        const curFrameRotation = this._framewiseRotation[this._frame.current];
        const prevFrameRotation = this._framewiseRotation[this._frame.previous];
        const differentRotation = curFrameRotation !== prevFrameRotation;
        // fit if tool is in the annotation mode or frame loading is first in the interpolation mode
        if (this._settings.resetZoom || this._frame.previous === null || differentRotation) {
            this._frame.previous = this._frame.current;
            this.fit(); // notify() inside the fit()
        } else {
            this._frame.previous = this._frame.current;
            this.notify();
        }

        return changed;
    }

    fit() {
        const img = this._frameProvider.require(this._frame.current);
        if (!img) return;

        const { rotation } = this.geometry;

        if ((rotation / 90) % 2) {
            // 90, 270, ..
            this._geometry.scale = Math.min(this._geometry.width / img.height,
                this._geometry.height / img.width);
        } else {
            // 0, 180, ..
            this._geometry.scale = Math.min(this._geometry.width / img.width,
                this._geometry.height / img.height);
        }

        this._geometry.top = (this._geometry.height - img.height * this._geometry.scale) / 2;
        this._geometry.left = (this._geometry.width - img.width * this._geometry.scale) / 2;

        window.cvat.player.rotation = rotation;
        window.cvat.player.geometry.scale = this._geometry.scale;
        this.notify();
    }

    focus(xtl, xbr, ytl, ybr) {
        const img = this._frameProvider.require(this._frame.current);
        if (!img) return;
        const fittedScale = Math.min(this._geometry.width / img.width,
            this._geometry.height / img.height);

        const boxWidth = xbr - xtl;
        const boxHeight = ybr - ytl;
        const wScale = this._geometry.width / boxWidth;
        const hScale = this._geometry.height / boxHeight;
        this._geometry.scale = Math.min(wScale, hScale);
        this._geometry.scale = Math.min(this._geometry.scale, MAX_PLAYER_SCALE);
        this._geometry.scale = Math.max(this._geometry.scale, MIN_PLAYER_SCALE);

        if (this._geometry.scale < fittedScale) {
            this._geometry.scale = fittedScale;
            this._geometry.top = (this._geometry.height - img.height * this._geometry.scale) / 2;
            this._geometry.left = (this._geometry.width - img.width * this._geometry.scale) / 2;
        } else {
            this._geometry.left = (this._geometry.width / this._geometry.scale - xtl * 2 - boxWidth) * this._geometry.scale / 2;
            this._geometry.top = (this._geometry.height / this._geometry.scale - ytl * 2 - boxHeight) * this._geometry.scale / 2;
        }
        window.cvat.player.geometry.scale = this._geometry.scale;
        this._frame.previous = this._frame.current; // fix infinite loop via playerUpdate->collectionUpdate*->AAMUpdate->playerUpdate->...
        this.notify();
    }

    scale(point, value) {
        if (!this._frameProvider.require(this._frame.current)) return;

        const oldScale = this._geometry.scale;
        const newScale = value > 0 ? this._geometry.scale * 6 / 5 : this._geometry.scale * 5 / 6;
        this._geometry.scale = Math.clamp(newScale, MIN_PLAYER_SCALE, MAX_PLAYER_SCALE);

        this._geometry.left += (point.x * (oldScale / this._geometry.scale - 1)) * this._geometry.scale;
        this._geometry.top += (point.y * (oldScale / this._geometry.scale - 1)) * this._geometry.scale;

        window.cvat.player.geometry.scale = this._geometry.scale;
        this.notify();
    }

    move(topOffset, leftOffset) {
        this._geometry.top += topOffset;
        this._geometry.left += leftOffset;
        this.notify();
    }

    rotate(angle) {
        if (['resize', 'drag'].indexOf(window.cvat.mode) !== -1) {
            return false;
        }

        if (this._settings.rotateAll) {
            this._geometry.rotation += angle;
            this._geometry.rotation %= 360;
        } else if (typeof (this._framewiseRotation[this._frame.current]) === 'undefined') {
            this._framewiseRotation[this._frame.current] = angle;
        } else {
            this._framewiseRotation[this._frame.current] += angle;
            this._framewiseRotation[this._frame.current] %= 360;
        }

        this.fit();
    }
}


class PlayerController {
    constructor(playerModel, activeTrack, find, playerOffset) {
        this._model = playerModel;
        this._find = find;
        this._rewinding = false;
        this._moving = false;
        this._leftOffset = playerOffset.left;
        this._topOffset = playerOffset.top;
        this._lastClickX = 0;
        this._lastClickY = 0;
        this._moveFrameEvent = null;
        this._events = {
            jump: null,
            move: null,
        };

        function setupPlayerShortcuts(playerModel) {
            const nextHandler = Logger.shortkeyLogDecorator((e) => {
                this.next();
                e.preventDefault();
            });

            const prevHandler = Logger.shortkeyLogDecorator((e) => {
                this.previous();
                e.preventDefault();
            });

            const nextKeyFrameHandler = Logger.shortkeyLogDecorator(() => {
                const active = activeTrack();
                if (active && active.type.split('_')[0] === 'interpolation') {
                    const nextKeyFrame = active.nextKeyFrame();
                    if (nextKeyFrame != null) {
                        this._model.shift(nextKeyFrame, true);
                    }
                }
            });

            const prevKeyFrameHandler = Logger.shortkeyLogDecorator(() => {
                const active = activeTrack();
                if (active && active.type.split('_')[0] === 'interpolation') {
                    const prevKeyFrame = active.prevKeyFrame();
                    if (prevKeyFrame != null) {
                        this._model.shift(prevKeyFrame, true);
                    }
                }
            });


            const nextFilterFrameHandler = Logger.shortkeyLogDecorator((e) => {
                const frame = this._find(1);
                if (frame != null) {
                    this._model.shift(frame, true);
                }
                e.preventDefault();
            });

            const prevFilterFrameHandler = Logger.shortkeyLogDecorator((e) => {
                const frame = this._find(-1);
                if (frame != null) {
                    this._model.shift(frame, true);
                }
                e.preventDefault();
            });


            const forwardHandler = Logger.shortkeyLogDecorator(() => {
                this.forward();
            });

            const backwardHandler = Logger.shortkeyLogDecorator(() => {
                this.backward();
            });

            const playPauseHandler = Logger.shortkeyLogDecorator(() => {
                if (playerModel.playing) {
                    this.pause();
                } else {
                    this.play();
                }
                return false;
            });

            const { shortkeys } = window.cvat.config;

            Mousetrap.bind(shortkeys.next_frame.value, nextHandler, 'keydown');
            Mousetrap.bind(shortkeys.prev_frame.value, prevHandler, 'keydown');
            Mousetrap.bind(shortkeys.next_filter_frame.value, nextFilterFrameHandler, 'keydown');
            Mousetrap.bind(shortkeys.prev_filter_frame.value, prevFilterFrameHandler, 'keydown');
            Mousetrap.bind(shortkeys.next_key_frame.value, nextKeyFrameHandler, 'keydown');
            Mousetrap.bind(shortkeys.prev_key_frame.value, prevKeyFrameHandler, 'keydown');
            Mousetrap.bind(shortkeys.forward_frame.value, forwardHandler, 'keydown');
            Mousetrap.bind(shortkeys.backward_frame.value, backwardHandler, 'keydown');
            Mousetrap.bind(shortkeys.play_pause.value, playPauseHandler, 'keydown');
            Mousetrap.bind(shortkeys.clockwise_rotation.value, (e) => {
                e.preventDefault();
                this.rotate(90);
            }, 'keydown');
            Mousetrap.bind(shortkeys.counter_clockwise_rotation.value, (e) => {
                e.preventDefault();
                this.rotate(-90);
            }, 'keydown');
        }

        setupPlayerShortcuts.call(this, playerModel);
    }

    zoom(e, canvas) {
        const point = window.cvat.translate.point.clientToCanvas(canvas, e.clientX, e.clientY);

        const zoomImageEvent = Logger.addContinuedEvent(Logger.EventType.zoomImage);

        if (e.originalEvent.deltaY < 0) {
            this._model.scale(point, 1);
        } else {
            this._model.scale(point, -1);
        }
        zoomImageEvent.close();
        e.preventDefault();
    }

    fit() {
        Logger.addEvent(Logger.EventType.fitImage);
        this._model.fit();
    }

    frameMouseDown(e) {
        if ((e.which === 1 && !window.cvat.mode) || (e.which === 2)) {
            this._moving = true;

            const p = window.cvat.translate.point.rotate(e.clientX, e.clientY);

            this._lastClickX = p.x;
            this._lastClickY = p.y;
        }
    }

    frameMouseUp() {
        this._moving = false;
        if (this._events.move) {
            this._events.move.close();
            this._events.move = null;
        }
    }

    frameMouseMove(e) {
        if (this._moving) {
            if (!this._events.move) {
                this._events.move = Logger.addContinuedEvent(Logger.EventType.moveImage);
            }

            const p = window.cvat.translate.point.rotate(e.clientX, e.clientY);
            const topOffset = p.y - this._lastClickY;
            const leftOffset = p.x - this._lastClickX;
            this._lastClickX = p.x;
            this._lastClickY = p.y;
            this._model.move(topOffset, leftOffset);
        }
    }

    progressMouseDown(e) {
        this._rewinding = true;
        this._rewind(e);
    }

    progressMouseUp() {
        this._rewinding = false;
        if (this._events.jump) {
            this._events.jump.close();
            this._events.jump = null;
        }
    }

    progressMouseMove(e) {
        this._rewind(e);
    }

    _rewind(e) {
        if (this._rewinding) {
            if (!this._events.jump) {
                this._events.jump = Logger.addContinuedEvent(Logger.EventType.jumpFrame);
            }

            const { frames } = this._model;
            const progressWidth = e.target.clientWidth;
            const x = e.clientX + window.pageXOffset - e.target.offsetLeft;
            const percent = x / progressWidth;
            const targetFrame = Math.round((frames.stop - frames.start) * percent);
            this._model.pause();
            this._model.shift(targetFrame + frames.start, true);
        }
    }

    changeStep(e) {
        const value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        e.target.value = value;
        this._model.multipleStep = value;
    }

    changeFPS(e) {
        const fpsMap = {
            1: 1,
            2: 5,
            3: 12,
            4: 25,
            5: 50,
            6: 100,
        };
        const value = Math.clamp(+e.target.value, 1, 6);
        this._model.fps = fpsMap[value];
    }

    changeResetZoom(e) {
        this._model.resetZoom = e.target.checked;
    }

    play() {
        this._model.play();
    }

    pause() {
        this._model.pause();
    }

    next() {
        this._model.shift(1);
        this._model.pause();
    }

    previous() {
        this._model.shift(-1);
        this._model.pause();
    }

    first() {
        this._model.shift(this._model.frames.start, true);
        this._model.pause();
    }

    last() {
        this._model.shift(this._model.frames.stop, true);
        this._model.pause();
    }

    forward() {
        this._model.shift(this._model.multipleStep);
        this._model.pause();
    }

    backward() {
        this._model.shift(-this._model.multipleStep);
        this._model.pause();
    }

    seek(frame) {
        this._model.shift(frame, true);
    }

    rotate(angle) {
        Logger.addEvent(Logger.EventType.rotateImage);
        this._model.rotate(angle);
    }

    get rotateAll() {
        return this._model.rotateAll;
    }

    set rotateAll(value) {
        this._model.rotateAll = value;
    }
}


class PlayerView {
    constructor(playerModel, playerController) {
        this._controller = playerController;
        this._playerUI = $('#playerFrame');
        this._playerBackgroundUI = $('#frameBackground');
        this._playerContentUI = $('#frameContent');
        this._playerGridUI = $('#frameGrid');
        this._playerTextUI = $('#frameText');
        this._progressUI = $('#playerProgress');
        this._loadingUI = $('#frameLoadingAnim');
        this._playButtonUI = $('#playButton');
        this._pauseButtonUI = $('#pauseButton');
        this._nextButtonUI = $('#nextButton');
        this._prevButtonUI = $('#prevButton');
        this._multipleNextButtonUI = $('#multipleNextButton');
        this._multiplePrevButtonUI = $('#multiplePrevButton');
        this._firstButtonUI = $('#firstButton');
        this._lastButtonUI = $('#lastButton');
        this._playerStepUI = $('#playerStep');
        this._playerSpeedUI = $('#speedSelect');
        this._resetZoomUI = $('#resetZoomBox');
        this._frameNumber = $('#frameNumber');
        this._playerGridPattern = $('#playerGridPattern');
        this._playerGridPath = $('#playerGridPath');
        this._contextMenuUI = $('#playerContextMenu');
        this._clockwiseRotationButtonUI = $('#clockwiseRotation');
        this._counterClockwiseRotationButtonUI = $('#counterClockwiseRotation');
        this._rotationWrapperUI = $('#rotationWrapper');
        this._rotatateAllImagesUI = $('#rotateAllImages');

        this._clockwiseRotationButtonUI.on('click', () => {
            this._controller.rotate(90);
        });

        this._counterClockwiseRotationButtonUI.on('click', () => {
            this._controller.rotate(-90);
        });

        this._rotatateAllImagesUI.prop('checked', this._controller.rotateAll);
        this._rotatateAllImagesUI.on('change', (e) => {
            this._controller.rotateAll = e.target.checked;
        });

        $('*').on('mouseup.player', () => this._controller.frameMouseUp());
        this._playerContentUI.on('mousedown', (e) => {
            const pos = window.cvat.translate.point.clientToCanvas(this._playerBackgroundUI[0],
                e.clientX, e.clientY);
            const { frameWidth } = window.cvat.player.geometry;
            const { frameHeight } = window.cvat.player.geometry;
            if (pos.x >= 0 && pos.y >= 0 && pos.x <= frameWidth && pos.y <= frameHeight) {
                this._controller.frameMouseDown(e);
            }
            e.preventDefault();
        });

        this._playerContentUI.on('wheel', e => this._controller.zoom(e, this._playerBackgroundUI[0]));
        this._playerContentUI.on('dblclick', () => this._controller.fit());
        this._playerContentUI.on('mousemove', e => this._controller.frameMouseMove(e));
        this._progressUI.on('mousedown', e => this._controller.progressMouseDown(e));
        this._progressUI.on('mouseup', () => this._controller.progressMouseUp());
        this._progressUI.on('mousemove', e => this._controller.progressMouseMove(e));
        this._playButtonUI.on('click', () => this._controller.play());
        this._pauseButtonUI.on('click', () => this._controller.pause());
        this._nextButtonUI.on('click', () => this._controller.next());
        this._prevButtonUI.on('click', () => this._controller.previous());
        this._multipleNextButtonUI.on('click', () => this._controller.forward());
        this._multiplePrevButtonUI.on('click', () => this._controller.backward());
        this._firstButtonUI.on('click', () => this._controller.first());
        this._lastButtonUI.on('click', () => this._controller.last());
        this._playerSpeedUI.on('change', e => this._controller.changeFPS(e));
        this._resetZoomUI.on('change', e => this._controller.changeResetZoom(e));
        this._playerStepUI.on('change', e => this._controller.changeStep(e));
        this._frameNumber.on('change', (e) => {
            if (Number.isInteger(+e.target.value)) {
                this._controller.seek(+e.target.value);
                blurAllElements();
            }
        });

        const { shortkeys } = window.cvat.config;

        this._clockwiseRotationButtonUI.attr('title', `
            ${shortkeys.clockwise_rotation.view_value} - ${shortkeys.clockwise_rotation.description}`);
        this._counterClockwiseRotationButtonUI.attr('title', `
            ${shortkeys.counter_clockwise_rotation.view_value} - ${shortkeys.counter_clockwise_rotation.description}`);

        const playerGridOpacityInput = $('#playerGridOpacityInput');
        playerGridOpacityInput.on('input', (e) => {
            const value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            e.target.value = value;
            this._playerGridPath.attr({
                opacity: value / +e.target.max,
            });
        });

        playerGridOpacityInput.attr('title', `
            ${shortkeys.change_grid_opacity.view_value} - ${shortkeys.change_grid_opacity.description}`);

        const playerGridStrokeInput = $('#playerGridStrokeInput');
        playerGridStrokeInput.on('change', (e) => {
            this._playerGridPath.attr({
                stroke: e.target.value,
            });
        });

        playerGridStrokeInput.attr('title', `
            ${shortkeys.change_grid_color.view_value} - ${shortkeys.change_grid_color.description}`);

        $('#playerGridSizeInput').on('change', (e) => {
            const value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            e.target.value = value;
            this._playerGridPattern.attr({
                width: value,
                height: value,
            });
        });

        Mousetrap.bind(shortkeys.focus_to_frame.value, () => this._frameNumber.focus(), 'keydown');
        Mousetrap.bind(shortkeys.change_grid_opacity.value,
            Logger.shortkeyLogDecorator((e) => {
                const ui = playerGridOpacityInput;
                let value = +ui.prop('value');
                value += e.key === '=' ? 1 : -1;
                value = Math.clamp(value, 0, 5);
                ui.prop('value', value);
                this._playerGridPath.attr({
                    opacity: value / +ui.prop('max'),
                });
            }),
            'keydown');

        Mousetrap.bind(shortkeys.change_grid_color.value,
            Logger.shortkeyLogDecorator(() => {
                const ui = playerGridStrokeInput;
                const colors = [];
                for (const opt of ui.find('option')) {
                    colors.push(opt.value);
                }
                const idx = colors.indexOf(this._playerGridPath.attr('stroke')) + 1;
                const value = colors[idx] || colors[0];
                this._playerGridPath.attr('stroke', value);
                ui.prop('value', value);
            }),
            'keydown');

        this._progressUI['0'].max = playerModel.frames.stop - playerModel.frames.start;
        this._progressUI['0'].value = 0;

        this._resetZoomUI.prop('checked', playerModel.resetZoom);
        this._playerStepUI.prop('value', playerModel.multipleStep);
        this._playerSpeedUI.prop('value', '4');

        this._frameNumber.attr('title', `
            ${shortkeys.focus_to_frame.view_value} - ${shortkeys.focus_to_frame.description}`);

        this._nextButtonUI.find('polygon').append($(document.createElementNS('http://www.w3.org/2000/svg', 'title'))
            .html(`${shortkeys.next_frame.view_value} - ${shortkeys.next_frame.description}`));

        this._prevButtonUI.find('polygon').append($(document.createElementNS('http://www.w3.org/2000/svg', 'title'))
            .html(`${shortkeys.prev_frame.view_value} - ${shortkeys.prev_frame.description}`));

        this._playButtonUI.find('polygon').append($(document.createElementNS('http://www.w3.org/2000/svg', 'title'))
            .html(`${shortkeys.play_pause.view_value} - ${shortkeys.play_pause.description}`));

        this._pauseButtonUI.find('polygon').append($(document.createElementNS('http://www.w3.org/2000/svg', 'title'))
            .html(`${shortkeys.play_pause.view_value} - ${shortkeys.play_pause.description}`));

        this._multipleNextButtonUI.find('polygon').append($(document.createElementNS('http://www.w3.org/2000/svg', 'title'))
            .html(`${shortkeys.forward_frame.view_value} - ${shortkeys.forward_frame.description}`));

        this._multiplePrevButtonUI.find('polygon').append($(document.createElementNS('http://www.w3.org/2000/svg', 'title'))
            .html(`${shortkeys.backward_frame.view_value} - ${shortkeys.backward_frame.description}`));


        this._contextMenuUI.click((e) => {
            $('.custom-menu').hide(100);
            switch ($(e.target).attr('action')) {
            case 'job_url': {
                window.cvat.search.set('frame', null);
                window.cvat.search.set('filter', null);
                copyToClipboard(window.cvat.search.toString());
                break;
            }
            case 'frame_url': {
                window.cvat.search.set('frame', window.cvat.player.frames.current);
                window.cvat.search.set('filter', null);
                copyToClipboard(window.cvat.search.toString());
                window.cvat.search.set('frame', null);
                break;
            }
            default:
            }
        });

        this._playerUI.on('contextmenu.playerContextMenu', (e) => {
            if (!window.cvat.mode) {
                $('.custom-menu').hide(100);
                this._contextMenuUI.finish().show(100);
                const x = Math.min(e.pageX, this._playerUI[0].offsetWidth
                    - this._contextMenuUI[0].scrollWidth);
                const y = Math.min(e.pageY, this._playerUI[0].offsetHeight
                    - this._contextMenuUI[0].scrollHeight);
                this._contextMenuUI.offset({
                    left: x,
                    top: y,
                });
                e.preventDefault();
            }
        });

        this._playerContentUI.on('mousedown.playerContextMenu', () => {
            $('.custom-menu').hide(100);
        });

        playerModel.subscribe(this);
    }

    onPlayerUpdate(model) {
        const { image } = model;
        const { frames } = model;
        const { geometry } = model;

        if (!image) {
            this._loadingUI.removeClass('hidden');
            this._playerBackgroundUI.css('background-image', '');
            return;
        }

        this._loadingUI.addClass('hidden');
        if (this._playerBackgroundUI.css('background-image').slice(5, -2) !== image.src) {
            this._playerBackgroundUI.css('background-image', `url("${image.src}")`);
        }

        if (model.playing) {
            this._playButtonUI.addClass('hidden');
            this._pauseButtonUI.removeClass('hidden');
        } else {
            this._pauseButtonUI.addClass('hidden');
            this._playButtonUI.removeClass('hidden');
        }

        if (frames.current === frames.start) {
            this._firstButtonUI.addClass('disabledPlayerButton');
            this._prevButtonUI.addClass('disabledPlayerButton');
            this._multiplePrevButtonUI.addClass('disabledPlayerButton');
        } else {
            this._firstButtonUI.removeClass('disabledPlayerButton');
            this._prevButtonUI.removeClass('disabledPlayerButton');
            this._multiplePrevButtonUI.removeClass('disabledPlayerButton');
        }

        if (frames.current === frames.stop) {
            this._lastButtonUI.addClass('disabledPlayerButton');
            this._nextButtonUI.addClass('disabledPlayerButton');
            this._playButtonUI.addClass('disabledPlayerButton');
            this._multipleNextButtonUI.addClass('disabledPlayerButton');
        } else {
            this._lastButtonUI.removeClass('disabledPlayerButton');
            this._nextButtonUI.removeClass('disabledPlayerButton');
            this._playButtonUI.removeClass('disabledPlayerButton');
            this._multipleNextButtonUI.removeClass('disabledPlayerButton');
        }

        this._progressUI['0'].value = frames.current - frames.start;

        this._rotationWrapperUI.css('transform', `rotate(${geometry.rotation}deg)`);

        for (const obj of [this._playerBackgroundUI, this._playerGridUI]) {
            obj.css('width', image.width);
            obj.css('height', image.height);
            obj.css('top', geometry.top);
            obj.css('left', geometry.left);
            obj.css('transform', `scale(${geometry.scale})`);
        }

        for (const obj of [this._playerContentUI, this._playerTextUI]) {
            obj.css('width', image.width + geometry.frameOffset * 2);
            obj.css('height', image.height + geometry.frameOffset * 2);
            obj.css('top', geometry.top - geometry.frameOffset * geometry.scale);
            obj.css('left', geometry.left - geometry.frameOffset * geometry.scale);
        }

        this._playerContentUI.css('transform', `scale(${geometry.scale})`);
        this._playerTextUI.css('transform', `scale(10) rotate(${-geometry.rotation}deg)`);
        this._playerGridPath.attr('stroke-width', 2 / geometry.scale);
        this._frameNumber.prop('value', frames.current);
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeMergerModel ShapeMergerController ShapeMergerView*/

/* global
    Listener:false
    Logger:false
    Mousetrap:false
*/

"use strict";

class ShapeMergerModel extends Listener {
    constructor(collectionModel) {
        super('onShapeMergerUpdate', () => this);
        this._collectionModel = collectionModel;
        this._shapesForMerge = [];
        this._mergeMode = false;
        this._shapeType = null;
    }

    _pushForMerge(shape) {
        if (!this._shapesForMerge.length) {
            this._shapeType = shape.type.split('_')[1];
            this._shapesForMerge.push(shape);
            shape.merge = true;
        }
        else if (shape.type.split('_')[1] == this._shapeType) {
            let idx = this._shapesForMerge.indexOf(shape);
            if (idx != -1) {
                this._shapesForMerge.splice(idx, 1);
                shape.merge = false;
            }
            else {
                this._shapesForMerge.push(shape);
                shape.merge = true;
            }
        }
    }

    start() {
        if (!window.cvat.mode) {
            window.cvat.mode = 'merge';
            this._mergeMode = true;
            this._collectionModel.resetActive();
            this.notify();
        }
    }

    done() {
        if (this._shapesForMerge.length > 1) {
            let shapeDict = {};

            for (let shape of this._shapesForMerge) {
                let keyframes = shape.keyframes;
                for (let keyframe of keyframes) {
                    keyframe = +keyframe;
                    let interpolation = shape.interpolate(keyframe);
                    if (keyframe in shapeDict && !interpolation.position.outside) {
                        shapeDict[keyframe] = {
                            shape: shape,
                            interpolation: interpolation
                        };
                    }
                    else if (!(keyframe in shapeDict)) {
                        shapeDict[keyframe] = {
                            shape: shape,
                            interpolation: interpolation
                        };
                    }
                }
            }

            let sortedFrames = Object.keys(shapeDict).map(x => +x).sort((a,b) => a - b);

            // remove all outside in begin of the track
            while (shapeDict[sortedFrames[0]].interpolation.position.outside) {
                delete shapeDict[sortedFrames[0]];
                sortedFrames.splice(0, 1);
            }

            // if several shapes placed on single frame, do not merge
            if (Object.keys(shapeDict).length <= 1) {
                this.cancel();
                return;
            }

            let label = shapeDict[sortedFrames[0]].shape.label;

            let object = {
                label_id: label,
                group: 0,
                frame: sortedFrames[0],
                attributes: [],
                shapes: [],
            };

            let lastMutableAttr = {};
            let attributes = shapeDict[sortedFrames[0]].interpolation.attributes;
            for (let attrId in attributes) {
                if (!window.cvat.labelsInfo.attrInfo(attrId).mutable) {
                    object.attributes.push({
                        id: attrId,
                        value: attributes[attrId].value,
                    });
                }
                else {
                    lastMutableAttr[attrId] = null;
                }
            }

            for (let frame of sortedFrames) {

                // Not save continiously attributes. Only updates.
                let shapeAttributes = [];
                if (shapeDict[frame].shape.label === label) {
                    let attributes = shapeDict[frame].interpolation.attributes;
                    for (let attrId in attributes) {
                        if (window.cvat.labelsInfo.attrInfo(attrId).mutable) {
                            if (attributes[attrId].value != lastMutableAttr[attrId]) {
                                lastMutableAttr[attrId] = attributes[attrId].value;
                                shapeAttributes.push({
                                    id: attrId,
                                    value: attributes[attrId].value,
                                });
                            }
                        }
                    }
                }

                object.shapes.push(
                    Object.assign(shapeDict[frame].interpolation.position,
                        {
                            frame: frame,
                            attributes: shapeAttributes
                        }
                    )
                );

                // push an outsided box after each annotation box if next frame is empty
                let nextFrame = frame + 1;
                let stopFrame = window.cvat.player.frames.stop;
                let type = shapeDict[frame].shape.type;
                if (type === 'annotation_box' && !(nextFrame in shapeDict) && nextFrame <= stopFrame) {
                    let copy = Object.assign({}, object.shapes[object.shapes.length - 1]);
                    copy.outside = true;
                    copy.frame += 1;
                    copy.z_order = 0;
                    copy.attributes = [];
                    object.shapes.push(copy);
                }
            }

            Logger.addEvent(Logger.EventType.mergeObjects, {
                count: this._shapesForMerge.length,
            });

            this._collectionModel.add(object, `interpolation_${this._shapeType}`);
            this._collectionModel.update();

            let model = this._collectionModel.shapes.slice(-1)[0];
            let shapes = this._shapesForMerge;

            // Undo/redo code
            window.cvat.addAction('Merge Objects', () => {
                model.unsubscribe(this._collectionModel);
                model.removed = true;
                for (let shape of shapes) {
                    shape.removed = false;
                    shape.subscribe(this._collectionModel);
                }
                this._collectionModel.update();
            }, () => {
                for (let shape of shapes) {
                    shape.removed = true;
                    shape.unsubscribe(this._collectionModel);
                }
                model.subscribe(this._collectionModel);
                model.removed = false;
            }, window.cvat.player.frames.current);
            // End of undo/redo code

            this.cancel();
            for (let shape of shapes) {
                shape.removed = true;
                shape.unsubscribe(this._collectionModel);
            }
        }
        else {
            this.cancel();
        }
    }

    cancel() {
        if (window.cvat.mode == 'merge') {
            window.cvat.mode = null;
            this._mergeMode = false;

            for (let shape of this._shapesForMerge) {
                shape.merge = false;
            }
            this._shapesForMerge = [];

            this.notify();
        }
    }

    click() {
        if (this._mergeMode) {
            const active = this._collectionModel.selectShape(
                this._collectionModel.lastPosition,
                true,
            );
            if (active) {
                this._pushForMerge(active);
            }
        }
    }

    get mergeMode() {
        return this._mergeMode;
    }
}

class ShapeMergerController {
    constructor(model) {
        this._model = model;

        setupMergeShortkeys.call(this);
        function setupMergeShortkeys() {
            let shortkeys = window.cvat.config.shortkeys;

            let switchMergeHandler = Logger.shortkeyLogDecorator(function() {
                this.switch();
            }.bind(this));

            Mousetrap.bind(shortkeys["switch_merge_mode"].value, switchMergeHandler.bind(this), 'keydown');
        }
    }

    switch() {
        if (this._model.mergeMode) {
            this._model.done();
        }
        else {
            this._model.start();
        }
    }

    click() {
        this._model.click();
    }
}

class ShapeMergerView {
    constructor(model, controller) {
        this._controller = controller;
        this._frameContent = $('#frameContent');
        this._mergeButton = $('#mergeTracksButton');
        this._mergeButton.on('click', () => controller.switch());

        let shortkeys = window.cvat.config.shortkeys;
        this._mergeButton.attr('title', `
            ${shortkeys['switch_merge_mode'].view_value} - ${shortkeys['switch_merge_mode'].description}`);

        model.subscribe(this);
    }

    onShapeMergerUpdate(shapeMerger) {
        if (shapeMerger.mergeMode) {
            this._mergeButton.text('Apply Merge');
            this._frameContent.on('click.merger', () => {
                this._controller.click();
            });
        }
        else {
            this._frameContent.off('click.merger');
            this._mergeButton.text('Merge Shapes');
        }
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeCreatorModel ShapeCreatorController ShapeCreatorView */

/* global
    AREA_TRESHOLD:false
    drawBoxSize:false
    Listener:false
    Logger:false
    Mousetrap:false
    PolyShapeModel:false
    showMessage:false
    STROKE_WIDTH:false
    SVG:false
    BorderSticker: false
*/

class ShapeCreatorModel extends Listener {
    constructor(shapeCollection) {
        super('onShapeCreatorUpdate', () => this);
        this._createMode = false;
        this._saveCurrent = false;
        this._defaultType = null;
        this._defaultMode = null;
        this._defaultLabel = null;
        this._currentFrame = null;
        this._createEvent = null;
        this._shapeCollection = shapeCollection;
    }

    finish(result) {
        const data = {};
        const frame = window.cvat.player.frames.current;

        data.label_id = this._defaultLabel;
        data.group = 0;
        data.frame = frame;
        data.occluded = false;
        data.outside = false;
        data.z_order = this._shapeCollection.zOrder(frame).max;
        data.attributes = [];

        if (this._createEvent) {
            this._createEvent.addValues({
                mode: this._defaultMode,
                type: this._defaultType,
                label: this._defaultLabel,
                frame,
            });
        }

        // FIXME: In the future we have to make some generic solution
        if (this._defaultMode === 'interpolation' 
            && ['box', 'points', 'box_by_4_points'].includes(this._defaultType)) {
            data.shapes = [];
            data.shapes.push(Object.assign({}, result, data));
            this._shapeCollection.add(data, `interpolation_${this._defaultType}`);
        } else {
            Object.assign(data, result);
            this._shapeCollection.add(data, `annotation_${this._defaultType}`);
        }

        const model = this._shapeCollection.shapes.slice(-1)[0];

        // Undo/redo code
        window.cvat.addAction('Draw Object', () => {
            model.removed = true;
            model.unsubscribe(this._shapeCollection);
        }, () => {
            model.subscribe(this._shapeCollection);
            model.removed = false;
        }, window.cvat.player.frames.current);
        // End of undo/redo code

        this._shapeCollection.update();
    }

    switchCreateMode(forceClose, usingShortkey) {
        this._usingShortkey = usingShortkey;
        // if parameter force (bool) setup to true, current result will not save
        if (!forceClose) {
            this._createMode = !this._createMode && window.cvat.mode == null;
            if (this._createMode) {
                this._createEvent = Logger.addContinuedEvent(Logger.EventType.drawObject);
                window.cvat.mode = 'creation';
            } else if (window.cvat.mode === 'creation') {
                window.cvat.mode = null;
            }
        } else {
            this._createMode = false;
            if (window.cvat.mode === 'creation') {
                window.cvat.mode = null;
                if (this._createEvent) {
                    this._createEvent.close();
                    this._createEvent = null;
                }
            }
        }
        this._saveCurrent = !forceClose;
        this.notify();
    }

    get currentShapes() {
        this._shapeCollection.update();
        return this._shapeCollection.currentShapes;
    }

    get saveCurrent() {
        return this._saveCurrent;
    }

    get createMode() {
        return this._createMode;
    }

    get usingShortkey() {
        return this._usingShortkey;
    }

    get defaultType() {
        return this._defaultType;
    }

    set defaultType(type) {
        if (!['box', 'box_by_4_points', 'points', 'polygon', 'polyline'].includes(type)) {
            throw Error(`Unknown shape type found ${type}`);
        }
        this._defaultType = type;
    }

    get defaultMode() {
        return this._defaultMode;
    }

    set defaultMode(mode) {
        this._defaultMode = mode;
    }

    set defaultLabel(labelId) {
        this._defaultLabel = +labelId;
    }
}


class ShapeCreatorController {
    constructor(drawerModel) {
        this._model = drawerModel;
        setupShortkeys.call(this);
        function setupShortkeys() {
            let shortkeys = window.cvat.config.shortkeys;

            let switchDrawHandler = Logger.shortkeyLogDecorator(function() {
                this.switchCreateMode(false, true);
            }.bind(this));

            Mousetrap.bind(shortkeys["switch_draw_mode"].value, switchDrawHandler.bind(this), 'keydown');
        }
    }

    switchCreateMode(force, usingShortkey = false) {
        this._model.switchCreateMode(force, usingShortkey);
    }

    setDefaultShapeType(type) {
        this._model.defaultType = type;
    }

    setDefaultShapeMode(mode) {
        this._model.defaultMode = mode;
    }

    setDefaultShapeLabel(labelId) {
        this._model.defaultLabel = labelId;
    }

    finish(result) {
        this._model.finish(result);
    }

    get currentShapes() {
        return this._model.currentShapes;
    }
}

class ShapeCreatorView {
    constructor(drawerModel, drawerController) {
        drawerModel.subscribe(this);
        this._controller = drawerController;
        this._createButton = $('#createShapeButton');
        this._labelSelector = $('#shapeLabelSelector');
        this._modeSelector = $('#shapeModeSelector');
        this._typeSelector = $('#shapeTypeSelector');
        this._polyShapeSizeInput = $('#polyShapeSize');
        this._commonBordersCheckbox = $('#commonBordersCheckbox');
        this._frameContent = SVG.adopt($('#frameContent')[0]);
        this._frameText = SVG.adopt($('#frameText')[0]);
        this._playerFrame = $('#playerFrame');
        this._createButton.on('click', () => this._controller.switchCreateMode(false));
        this._drawInstance = null;
        this._aim = null;
        this._aimCoord = {
            x: 0,
            y: 0
        };
        this._polyShapeSize = 0;
        this._type = null;
        this._mode = null;
        this._cancel = false;
        this._scale = 1;
        this._borderSticker = null;

        let shortkeys = window.cvat.config.shortkeys;
        this._createButton.attr('title', `
            ${shortkeys['switch_draw_mode'].view_value} - ${shortkeys['switch_draw_mode'].description}`);

        this._labelSelector.attr('title', `
            ${shortkeys['change_default_label'].view_value} - ${shortkeys['change_default_label'].description}`);

        const labels = window.cvat.labelsInfo.labels();
        const labelsKeys = Object.keys(labels);
        for (let i = 0; i < labelsKeys.length; i += 1) {
            this._labelSelector.append(
                // eslint-disable-next-line
                $(`<option value=${labelsKeys[i]}> ${labels[labelsKeys[i]].normalize()} </option>`)
            );
        }
        this._labelSelector.val(labelsKeys[0]);

        this._typeSelector.val('box');
        this._typeSelector.on('change', (e) => {
            // FIXME: In the future we have to make some generic solution
            const mode = this._modeSelector.prop('value');
            const type = $(e.target).prop('value');
            if (type !== 'box' && type !== 'box_by_4_points' 
                && !(type === 'points' && this._polyShapeSize === 1) && mode !== 'annotation') {
                this._modeSelector.prop('value', 'annotation');
                this._controller.setDefaultShapeMode('annotation');
                showMessage('Only the annotation mode allowed for the shape');
            }
            this._controller.setDefaultShapeType(type);
        }).trigger('change');

        this._labelSelector.on('change', (e) => {
            this._controller.setDefaultShapeLabel($(e.target).prop('value'));
        }).trigger('change');

        this._modeSelector.on('change', (e) => {
            // FIXME: In the future we have to make some generic solution
            const mode = $(e.target).prop('value');
            const type = this._typeSelector.prop('value');
            if (mode !== 'annotation' && !(type === 'points' && this._polyShapeSize === 1)
                && type !== 'box' && type !== 'box_by_4_points') {
                this._typeSelector.prop('value', 'box');
                this._controller.setDefaultShapeType('box');
                showMessage('Only boxes and single point allowed in the interpolation mode');
            }
            this._controller.setDefaultShapeMode(mode);
        }).trigger('change');

        this._polyShapeSizeInput.on('change', (e) => {
            e.stopPropagation();
            let size = +e.target.value;
            if (size < 0) size = 0;
            if (size > 100) size = 0;
            const mode = this._modeSelector.prop('value');
            const type = this._typeSelector.prop('value');
            if (mode === 'interpolation' && type === 'points' && size !== 1) {
                showMessage('Only single point allowed in the interpolation mode');
                size = 1;
            }

            e.target.value = size || '';
            this._polyShapeSize = size;
        }).trigger('change');

        this._polyShapeSizeInput.on('keydown', function(e) {
            e.stopPropagation();
        });

        this._playerFrame.on('mousemove.shapeCreatorAIM', (e) => {
            if (!['polygon', 'polyline', 'points'].includes(this._type)) {
                this._aimCoord = window.cvat.translate.point.clientToCanvas(this._frameContent.node, e.clientX, e.clientY);
                if (this._aim) {
                    this._aim.x.attr({
                        y1: this._aimCoord.y,
                        y2: this._aimCoord.y,
                    });

                    this._aim.y.attr({
                        x1: this._aimCoord.x,
                        x2: this._aimCoord.x,
                    });
                }
            }
        });

        this._commonBordersCheckbox.on('change.shapeCreator', (e) => {
            if (this._drawInstance) {
                if (!e.target.checked) {
                    if (this._borderSticker) {
                        this._borderSticker.disable();
                        this._borderSticker = null;
                    }
                } else {
                    this._borderSticker = new BorderSticker(this._drawInstance, this._frameContent,
                        this._controller.currentShapes, this._scale);
                }
            }
        });
    }

    _createPolyEvents() {
        // If number of points for poly shape specified, use it.
        // Dicrement number on draw new point events. Drawstart trigger when create first point
        let lastPoint = {
            x: null,
            y: null,
        };

        let numberOfPoints = 0;
        this._drawInstance.attr({
            z_order: Number.MAX_SAFE_INTEGER,
        });

        if (this._polyShapeSize) {
            let size = this._polyShapeSize;
            const sizeDecrement = function sizeDecrement() {
                size -= 1;
                if (!size) {
                    numberOfPoints = this._polyShapeSize;
                    this._drawInstance.draw('done');
                }
            }.bind(this);

            const sizeIncrement = function sizeIncrement() {
                size += 1;
            };

            this._drawInstance.on('drawstart', sizeDecrement);
            this._drawInstance.on('drawpoint', sizeDecrement);
            this._drawInstance.on('undopoint', sizeIncrement);
        }
        // Otherwise draw will stop by Ctrl + N press

        this._drawInstance.on('drawpoint', () => {
            if (this._borderSticker) {
                this._borderSticker.reset();
            }
        });

        // Callbacks for point scale
        this._drawInstance.on('drawstart', this._rescaleDrawPoints.bind(this));
        this._drawInstance.on('drawpoint', this._rescaleDrawPoints.bind(this));

        this._drawInstance.on('drawstart', (e) => {
            lastPoint = {
                x: e.detail.event.clientX,
                y: e.detail.event.clientY,
            };
            numberOfPoints ++;
        });

        this._drawInstance.on('drawpoint', (e) => {
            lastPoint = {
                x: e.detail.event.clientX,
                y: e.detail.event.clientY,
            };
            numberOfPoints ++;
        });

        this._commonBordersCheckbox.css('display', '').trigger('change.shapeCreator');
        this._commonBordersCheckbox.parent().css('display', '');
        $('body').on('keydown.shapeCreator', (e) => {
            if (e.ctrlKey && e.keyCode === 17) {
                this._commonBordersCheckbox.prop('checked', !this._borderSticker);
                this._commonBordersCheckbox.trigger('change.shapeCreator');
            }
        });

        this._frameContent.on('mousedown.shapeCreator', (e) => {
            if (e.which === 3) {
                let lenBefore = this._drawInstance.array().value.length;
                this._drawInstance.draw('undo');
                if (this._borderSticker) {
                    this._borderSticker.reset();
                }
                let lenAfter = this._drawInstance.array().value.length;
                if (lenBefore != lenAfter) {
                    numberOfPoints --;
                }
            }
        });

        this._frameContent.on('mousemove.shapeCreator', (e) => {
            if (e.shiftKey && ['polygon', 'polyline'].includes(this._type)) {
                if (lastPoint.x === null || lastPoint.y === null) {
                    this._drawInstance.draw('point', e);
                }
                else {
                    let delta = Math.sqrt(Math.pow(e.clientX - lastPoint.x, 2) + Math.pow(e.clientY - lastPoint.y, 2));
                    let deltaTreshold = 15;
                    if (delta > deltaTreshold) {
                        this._drawInstance.draw('point', e);
                        lastPoint = {
                            x: e.clientX,
                            y: e.clientY,
                        };
                    }
                }
            }
        });

        this._drawInstance.on('drawstop', () => {
            this._frameContent.off('mousedown.shapeCreator');
            this._frameContent.off('mousemove.shapeCreator');
            this._commonBordersCheckbox.css('display', 'none');
            this._commonBordersCheckbox.parent().css('display', 'none');
            $('body').off('keydown.shapeCreator');
            if (this._borderSticker) {
                this._borderSticker.disable();
                this._borderSticker = null;
            }
        });
        // Also we need callback on drawdone event for get points
        this._drawInstance.on('drawdone', function(e) {
            let actualPoints = window.cvat.translate.points.canvasToActual(e.target.getAttribute('points'));
            actualPoints = PolyShapeModel.convertStringToNumberArray(actualPoints);

            // Min 2 points for polyline and 3 points for polygon
            if (actualPoints.length) {
                if (this._type === 'polyline' && actualPoints.length < 2) {
                    showMessage("Min 2 points must be for polyline drawing.");
                }
                else if (this._type === 'polygon' && actualPoints.length < 3) {
                    showMessage("Min 3 points must be for polygon drawing.");
                }
                else {
                    let frameWidth = window.cvat.player.geometry.frameWidth;
                    let frameHeight = window.cvat.player.geometry.frameHeight;
                    for (let point of actualPoints) {
                        point.x = Math.clamp(point.x, 0, frameWidth);
                        point.y = Math.clamp(point.y, 0, frameHeight);
                    }
                    actualPoints =  PolyShapeModel.convertNumberArrayToString(actualPoints);

                    // Update points in a view in order to get an updated box
                    e.target.setAttribute('points', window.cvat.translate.points.actualToCanvas(actualPoints));
                    let polybox = e.target.getBBox();
                    let w = polybox.width;
                    let h = polybox.height;
                    let area = w * h;
                    let type = this._type;

                    if (area >= AREA_TRESHOLD || type === 'points' && numberOfPoints || type === 'polyline' && (w >= AREA_TRESHOLD || h >= AREA_TRESHOLD)) {
                        this._controller.finish({points: actualPoints}, type);
                    }
                }
            }

            this._controller.switchCreateMode(true);
        }.bind(this));
    }

    _create() {
        let sizeUI = null;
        switch(this._type) {
        case 'box':
            this._drawInstance = this._frameContent.rect().draw({ snapToGrid: 0.1 }).addClass('shapeCreation').attr({
                'stroke-width': STROKE_WIDTH / this._scale,
                z_order: Number.MAX_SAFE_INTEGER,
            }).on('drawstop', function(e) {
                if (this._cancel) return;
                if (sizeUI) {
                    sizeUI.rm();
                    sizeUI = null;
                }

                const frameWidth = window.cvat.player.geometry.frameWidth;
                const frameHeight = window.cvat.player.geometry.frameHeight;
                const rect = window.cvat.translate.box.canvasToActual(e.target.getBBox());

                const xtl = Math.clamp(rect.x, 0, frameWidth);
                const ytl = Math.clamp(rect.y, 0, frameHeight);
                const xbr = Math.clamp(rect.x + rect.width, 0, frameWidth);
                const ybr = Math.clamp(rect.y + rect.height, 0, frameHeight);
                if ((ybr - ytl) * (xbr - xtl) >= AREA_TRESHOLD) {
                    const box = {
                        xtl,
                        ytl,
                        xbr,
                        ybr,
                    };

                    if (this._mode === 'interpolation') {
                        box.outside = false;
                    }

                    this._controller.finish(box, this._type);
                }

                this._controller.switchCreateMode(true);
            }.bind(this)).on('drawupdate', (e) => {
                sizeUI = drawBoxSize.call(sizeUI, this._frameContent, this._frameText, e.target.getBBox());
            }).on('drawcancel', () => {
                if (sizeUI) {
                    sizeUI.rm();
                    sizeUI = null;
                }
            });
            break;
        case 'box_by_4_points':
            let numberOfPoints = 0;
            this._drawInstance = this._frameContent.polyline().draw({ snapToGrid: 0.1 })
                .addClass('shapeCreation').attr({
                    'stroke-width': 0,
                }).on('drawstart', () => {
                    // init numberOfPoints as one on drawstart
                    numberOfPoints = 1;
                }).on('drawpoint', (e) => {
                    // increase numberOfPoints by one on drawpoint
                    numberOfPoints += 1;

                    // finish if numberOfPoints are exactly four
                    if (numberOfPoints === 4) {
                        let actualPoints = window.cvat.translate.points.canvasToActual(e.target.getAttribute('points'));
                        actualPoints = PolyShapeModel.convertStringToNumberArray(actualPoints);
                        const { frameWidth, frameHeight } = window.cvat.player.geometry;

                        // init bounding box
                        const box = {
                            'xtl': frameWidth,
                            'ytl': frameHeight,
                            'xbr': 0,
                            'ybr': 0
                        };

                        for (const point of actualPoints) {
                            // clamp point
                            point.x = Math.clamp(point.x, 0, frameWidth);
                            point.y = Math.clamp(point.y, 0, frameHeight);

                            // update bounding box
                            box.xtl = Math.min(point.x, box.xtl);
                            box.ytl = Math.min(point.y, box.ytl);
                            box.xbr = Math.max(point.x, box.xbr);
                            box.ybr = Math.max(point.y, box.ybr);
                        }

                        if ((box.ybr - box.ytl) * (box.xbr - box.xtl) >= AREA_TRESHOLD) {
                            if (this._mode === 'interpolation') {
                                box.outside = false;
                            }
                            // finish drawing
                            this._controller.finish(box, this._type);
                        }
                        this._controller.switchCreateMode(true);
                    }
                }).on('undopoint', () => {
                    if (numberOfPoints > 0) {
                        numberOfPoints -= 1;
                    }
                }).off('drawdone').on('drawdone', () => {
                    if (numberOfPoints !== 4) {
                        showMessage('Click exactly four extreme points for an object');
                        this._controller.switchCreateMode(true);
                    } else {
                        throw Error('numberOfPoints is exactly four, but box drawing did not finish.');
                    }
                });
            this._createPolyEvents();
            break;
        case 'points':
            this._drawInstance = this._frameContent.polyline().draw({ snapToGrid: 0.1 })
                .addClass('shapeCreation').attr({
                    'stroke-width': 0,
                });
            this._createPolyEvents();
            break;
        case 'polygon':
            if (this._polyShapeSize && this._polyShapeSize < 3) {
                if (!$('.drawAllert').length) {
                    showMessage("Min 3 points must be for polygon drawing.").addClass('drawAllert');
                }
                this._controller.switchCreateMode(true);
                return;
            }
            this._drawInstance = this._frameContent.polygon().draw({ snapToGrid: 0.1 })
                .addClass('shapeCreation').attr({
                    'stroke-width':  STROKE_WIDTH / this._scale,
                });
            this._createPolyEvents();
            break;
        case 'polyline':
            if (this._polyShapeSize && this._polyShapeSize < 2) {
                if (!$('.drawAllert').length) {
                    showMessage("Min 2 points must be for polyline drawing.").addClass('drawAllert');
                }
                this._controller.switchCreateMode(true);
                return;
            }
            this._drawInstance = this._frameContent.polyline().draw({ snapToGrid: 0.1 })
                .addClass('shapeCreation').attr({
                    'stroke-width':  STROKE_WIDTH / this._scale,
                });
            this._createPolyEvents();
            break;
        default:
            throw Error(`Bad type found ${this._type}`);
        }
    }

    _rescaleDrawPoints() {
        let scale = this._scale;
        $('.svg_draw_point').each(function() {
            this.instance.radius(2.5 / scale).attr('stroke-width', 1 / scale);
        });
    }

    _drawAim() {
        if (!(this._aim)) {
            this._aim = {
                x: this._frameContent.line(0, this._aimCoord.y, this._frameContent.node.clientWidth, this._aimCoord.y)
                    .attr({
                        'stroke-width': STROKE_WIDTH / this._scale,
                        'stroke': 'red',
                        'z_order': Number.MAX_SAFE_INTEGER,
                    }).addClass('aim'),
                y: this._frameContent.line(this._aimCoord.x, 0, this._aimCoord.x, this._frameContent.node.clientHeight)
                    .attr({
                        'stroke-width': STROKE_WIDTH / this._scale,
                        'stroke': 'red',
                        'z_order': Number.MAX_SAFE_INTEGER,
                    }).addClass('aim'),
            };
        }
    }

    _removeAim() {
        if (this._aim) {
            this._aim.x.remove();
            this._aim.y.remove();
            this._aim = null;
        }
    }

    onShapeCreatorUpdate(model) {
        if (model.createMode && !this._drawInstance) {
            this._cancel = false;
            this._type = model.defaultType;
            this._mode = model.defaultMode;

            if (!['polygon', 'polyline', 'points'].includes(this._type)) {
                if (!model.usingShortkey) {
                    this._aimCoord = {
                        x: 0,
                        y: 0
                    };
                }
                this._drawAim();
            }

            this._createButton.text("Stop Creation");
            document.oncontextmenu = () => false;
            this._create();
        }
        else {
            this._removeAim();
            this._cancel = true;
            this._createButton.text("Create Shape");
            document.oncontextmenu = null;
            if (this._drawInstance) {
                // We save current result for poly shape if it's need
                // drawInstance will be removed after save when drawdone handler calls switchCreateMode with force argument
                if (model.saveCurrent && this._type != 'box') {
                    this._drawInstance.draw('done');
                }
                else {
                    this._drawInstance.draw('cancel');
                    this._drawInstance.remove();
                    this._drawInstance = null;
                }
            }
        }

        this._typeSelector.prop('disabled', model.createMode);
        this._modeSelector.prop('disabled', model.createMode);
        this._polyShapeSizeInput.prop('disabled', model.createMode);
    }

    onPlayerUpdate(player) {
        if (!player.ready()) return;
        if (this._scale != player.geometry.scale) {
            this._scale = player.geometry.scale;
            if (this._drawInstance) {
                this._rescaleDrawPoints();
                if (this._borderSticker) {
                    this._borderSticker.scale(this._scale);
                }
                if (this._aim) {
                    this._aim.x.attr('stroke-width', STROKE_WIDTH / this._scale);
                    this._aim.y.attr('stroke-width', STROKE_WIDTH / this._scale);
                }
                if (['box', 'polygon', 'polyline'].includes(this._type)) {
                    this._drawInstance.attr('stroke-width', STROKE_WIDTH / this._scale);
                }
            }
        }
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeBufferModel ShapeBufferController ShapeBufferView */

/* global
    AREA_TRESHOLD:false
    userConfirm:false
    Listener:false
    Logger:false
    Mousetrap:false
    POINT_RADIUS:false
    PolyShapeModel:false
    STROKE_WIDTH:false
    SVG:false
*/

"use strict";

class ShapeBufferModel extends Listener  {
    constructor(collection) {
        super('onShapeBufferUpdate', () => this);
        this._collection = collection;
        this._pasteMode = false;
        this._propagateFrames = 50;
        this._shape = {
            type: null,
            mode: null,
            position: null,
            attributes: null,
            label: null,
            clear: function() {
                this.type = null;
                this.mode = null;
                this.position = null;
                this.attributes = null;
                this.label = null;
            },
        };
    }

    _startPaste() {
        if (!this._pasteMode && this._shape.type) {
            if (!window.cvat.mode) {
                this._collection.resetActive();
                window.cvat.mode = 'paste';
                this._pasteMode = true;
                this.notify();
            }
        }
    }

    _cancelPaste() {
        if (this._pasteMode) {
            if (window.cvat.mode === 'paste') {
                window.cvat.mode = null;
                this._pasteMode = false;
                this.notify();
            }
        }
    }

    _makeObject(box, points, isTracked) {
        if (!this._shape.type) {
            return null;
        }

        let attributes = [];
        let object = {};

        for (let attrId in this._shape.attributes) {
            attributes.push({
                id: attrId,
                value: this._shape.attributes[attrId].value,
            });
        }

        object.label_id = this._shape.label;
        object.group = 0;
        object.frame = window.cvat.player.frames.current;
        object.attributes = attributes;

        if (this._shape.type === 'box') {
            const position = {
                xtl: box.xtl,
                ytl: box.ytl,
                xbr: box.xbr,
                ybr: box.ybr,
                occluded: this._shape.position.occluded,
                frame: window.cvat.player.frames.current,
                z_order: this._collection.zOrder(window.cvat.player.frames.current).max,
            };

            if (isTracked) {
                object.shapes = [];
                object.shapes.push(Object.assign(position, {
                    outside: false,
                    attributes: [],
                }));
            } else {
                Object.assign(object, position);
            }
        } else {
            const position = {};
            position.points = points;
            position.occluded = this._shape.position.occluded;
            position.frame = window.cvat.player.frames.current;
            position.z_order = this._collection.zOrder(position.frame).max;

            Object.assign(object, position);
        }

        return object;
    }

    switchPaste() {
        if (this._pasteMode) {
            this._cancelPaste();
        }
        else {
            this._startPaste();
        }
    }

    copyToBuffer() {
        let activeShape = this._collection.activeShape;
        if (activeShape) {
            Logger.addEvent(Logger.EventType.copyObject, {
                count: 1,
            });
            let interpolation = activeShape.interpolate(window.cvat.player.frames.current);
            if (!interpolation.position.outsided) {
                this._shape.type = activeShape.type.split('_')[1];
                this._shape.mode = activeShape.type.split('_')[0];
                this._shape.label = activeShape.label;
                this._shape.attributes = interpolation.attributes;
                this._shape.position = interpolation.position;
            }
            return true;
        }
        return false;
    }

    pasteToFrame(box, polyPoints) {
        let object = this._makeObject(box, polyPoints, this._shape.mode === 'interpolation');

        if (object) {
            Logger.addEvent(Logger.EventType.pasteObject);
            if (this._shape.type === 'box') {
                this._collection.add(object, `${this._shape.mode}_${this._shape.type}`);
            }
            else {
                this._collection.add(object, `annotation_${this._shape.type}`);
            }

            // Undo/redo code
            let model = this._collection.shapes.slice(-1)[0];
            window.cvat.addAction('Paste Object', () => {
                model.removed = true;
                model.unsubscribe(this._collection);
            }, () => {
                model.subscribe(this._collection);
                model.removed = false;
            }, window.cvat.player.frames.current);
            // End of undo/redo code

            this._collection.update();
        }
    }

    propagateToFrames() {
        let numOfFrames = this._propagateFrames;
        if (this._shape.type && Number.isInteger(numOfFrames)) {
            let object = null;
            if (this._shape.type === 'box') {
                let box = {
                    xtl: this._shape.position.xtl,
                    ytl: this._shape.position.ytl,
                    xbr: this._shape.position.xbr,
                    ybr: this._shape.position.ybr,
                };
                object = this._makeObject(box, null, false);
            } else {
                object = this._makeObject(null, this._shape.position.points, false);
            }

            if (object) {
                Logger.addEvent(Logger.EventType.propagateObject, {
                    count: numOfFrames,
                });

                let imageSizes = window.cvat.job.images;
                let startFrame = window.cvat.player.frames.start;
                let originalImageSize = imageSizes[object.frame - startFrame] || imageSizes[0];

                // Getting normalized coordinates [0..1]
                let normalized = {};
                if (this._shape.type === 'box') {
                    normalized.xtl = object.xtl / originalImageSize.width;
                    normalized.ytl = object.ytl / originalImageSize.height;
                    normalized.xbr = object.xbr / originalImageSize.width;
                    normalized.ybr = object.ybr / originalImageSize.height;
                }
                else {
                    normalized.points = [];
                    for (let point of PolyShapeModel.convertStringToNumberArray(object.points)) {
                        normalized.points.push({
                            x: point.x / originalImageSize.width,
                            y: point.y / originalImageSize.height,
                        });
                    }
                }

                let addedObjects = [];
                while (numOfFrames > 0 && (object.frame + 1 <= window.cvat.player.frames.stop)) {
                    object.frame ++;
                    numOfFrames --;

                    object.z_order = this._collection.zOrder(object.frame).max;
                    let imageSize = imageSizes[object.frame - startFrame] || imageSizes[0];
                    let position = {};
                    if (this._shape.type === 'box') {
                        position.xtl = normalized.xtl * imageSize.width;
                        position.ytl = normalized.ytl * imageSize.height;
                        position.xbr = normalized.xbr * imageSize.width;
                        position.ybr = normalized.ybr * imageSize.height;
                    }
                    else {
                        position.points = [];
                        for (let point of normalized.points) {
                            position.points.push({
                                x: point.x * imageSize.width,
                                y: point.y * imageSize.height,
                            });
                        }
                        position.points = PolyShapeModel.convertNumberArrayToString(position.points);
                    }
                    Object.assign(object, position);
                    this._collection.add(object, `annotation_${this._shape.type}`);
                    addedObjects.push(this._collection.shapes.slice(-1)[0]);
                }

                if (addedObjects.length) {
                    // Undo/redo code
                    window.cvat.addAction('Propagate Object', () => {
                        for (let object of addedObjects) {
                            object.removed = true;
                            object.unsubscribe(this._collection);
                        }
                    }, () => {
                        for (let object of addedObjects) {
                            object.removed = false;
                            object.subscribe(this._collection);
                        }
                    }, window.cvat.player.frames.current);
                    // End of undo/redo code
                }
            }
        }
    }

    get pasteMode() {
        return this._pasteMode;
    }

    get shape() {
        return this._shape;
    }

    set propagateFrames(value) {
        this._propagateFrames = value;
    }

    get propagateFrames() {
        return this._propagateFrames;
    }
}


class ShapeBufferController {
    constructor(model) {
        this._model = model;
        setupBufferShortkeys.call(this);

        function setupBufferShortkeys() {
            let copyHandler = Logger.shortkeyLogDecorator(function() {
                this._model.copyToBuffer();
            }.bind(this));

            let switchHandler = Logger.shortkeyLogDecorator(function() {
                this._model.switchPaste();
            }.bind(this));

            let propagateDialogShowed = false;
            let propagateHandler = Logger.shortkeyLogDecorator(function() {
                if (!propagateDialogShowed) {
                    blurAllElements();
                    if (this._model.copyToBuffer()) {
                        let curFrame = window.cvat.player.frames.current;
                        let startFrame = window.cvat.player.frames.start;
                        let endFrame = Math.min(window.cvat.player.frames.stop, curFrame + this._model.propagateFrames);
                        let imageSizes = window.cvat.job.images;

                        let message = `Propagate up to ${endFrame} frame. `;
                        let refSize = imageSizes[curFrame - startFrame] || imageSizes[0];
                        for (let _frame = curFrame + 1; _frame <= endFrame; _frame ++) {
                            let size = imageSizes[_frame - startFrame] || imageSizes[0];
                            if ((size.width != refSize.width) || (size.height != refSize.height) ) {
                                message += 'Some covered frames have another resolution. Shapes in them can differ from reference. ';
                                break;
                            }
                        }
                        message += 'Are you sure?';

                        propagateDialogShowed = true;
                        userConfirm(message, () => {
                            this._model.propagateToFrames();
                            propagateDialogShowed = false;
                        }, () => propagateDialogShowed = false);
                    }
                }
            }.bind(this));

            let shortkeys = window.cvat.config.shortkeys;
            Mousetrap.bind(shortkeys["copy_shape"].value, copyHandler, 'keydown');
            Mousetrap.bind(shortkeys["propagate_shape"].value, propagateHandler, 'keydown');
            Mousetrap.bind(shortkeys["switch_paste"].value, switchHandler, 'keydown');
        }
    }

    pasteToFrame(e, bbRect, polyPoints) {
        if (this._model.pasteMode) {
            if (bbRect || polyPoints) {
                this._model.pasteToFrame(bbRect, polyPoints);
            }

            if (!e.ctrlKey) {
                this._model.switchPaste();
            }
        }
    }

    set propagateFrames(value) {
        this._model.propagateFrames = value;
    }
}



class ShapeBufferView {
    constructor(model, controller) {
        model.subscribe(this);
        this._controller = controller;
        this._frameContent = SVG.adopt($('#frameContent')[0]);
        this._propagateFramesInput = $('#propagateFramesInput');
        this._shape = null;
        this._shapeView = null;
        this._shapeViewGroup = null;

        this._controller.propagateFrames = +this._propagateFramesInput.prop('value');
        this._propagateFramesInput.on('change', (e) => {
            let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            e.target.value = value;
            this._controller.propagateFrames = value;
        });
    }

    _drawShapeView() {
        let scale = window.cvat.player.geometry.scale;
        let points = this._shape.position.points ?
            window.cvat.translate.points.actualToCanvas(this._shape.position.points) : null;

        switch (this._shape.type) {
        case 'box': {
            let width = this._shape.position.xbr - this._shape.position.xtl;
            let height = this._shape.position.ybr - this._shape.position.ytl;
            this._shape.position = window.cvat.translate.box.actualToCanvas(this._shape.position);
            this._shapeView = this._frameContent.rect(width, height)
                .move(this._shape.position.xtl, this._shape.position.ytl).addClass('shapeCreation').attr({
                    'stroke-width': STROKE_WIDTH / scale,
                });
            break;
        }
        case 'polygon':
            this._shapeView = this._frameContent.polygon(points).addClass('shapeCreation').attr({
                'stroke-width': STROKE_WIDTH / scale,
            });
            break;
        case 'polyline':
            this._shapeView = this._frameContent.polyline(points).addClass('shapeCreation').attr({
                'stroke-width': STROKE_WIDTH / scale,
            });
            break;
        case 'points':
            this._shapeView = this._frameContent.polyline(points).addClass('shapeCreation').attr({
                'stroke-width': 0,
            });

            this._shapeViewGroup = this._frameContent.group();
            for (let point of PolyShapeModel.convertStringToNumberArray(points)) {
                let radius = POINT_RADIUS * 2 / window.cvat.player.geometry.scale;
                let scaledStroke = STROKE_WIDTH / window.cvat.player.geometry.scale;
                this._shapeViewGroup.circle(radius).move(point.x - radius / 2, point.y - radius / 2)
                    .fill('white').stroke('black').attr('stroke-width', scaledStroke).addClass('pasteTempMarker');
            }
            break;
        default:
            throw Error(`Unknown shape type found: ${this._shape.type}`);
        }

        this._shapeView.attr({
            'z_order': Number.MAX_SAFE_INTEGER,
        });
    }

    _moveShapeView(pos) {
        let rect = this._shapeView.node.getBBox();

        this._shapeView.move(pos.x - rect.width / 2, pos.y - rect.height / 2);
        if (this._shapeViewGroup) {
            let rect = this._shapeViewGroup.node.getBBox();
            this._shapeViewGroup.move(pos.x - rect.x - rect.width / 2, pos.y - rect.y - rect.height / 2);
        }
    }

    _removeShapeView() {
        this._shapeView.remove();
        this._shapeView = null;
        if (this._shapeViewGroup) {
            this._shapeViewGroup.remove();
            this._shapeViewGroup = null;
        }
    }

    _enableEvents() {
        this._frameContent.on('mousemove.buffer', (e) => {
            let pos = window.cvat.translate.point.clientToCanvas(this._frameContent.node, e.clientX, e.clientY);
            this._shapeView.style('visibility', '');
            this._moveShapeView(pos);
        });

        this._frameContent.on('mousedown.buffer', (e) => {
            if (e.which != 1) return;
            if (this._shape.type != 'box') {
                let actualPoints = window.cvat.translate.points.canvasToActual(this._shapeView.attr('points'));
                let frameWidth = window.cvat.player.geometry.frameWidth;
                let frameHeight = window.cvat.player.geometry.frameHeight;

                actualPoints = PolyShapeModel.convertStringToNumberArray(actualPoints);
                for (let point of actualPoints) {
                    point.x = Math.clamp(point.x, 0, frameWidth);
                    point.y = Math.clamp(point.y, 0, frameHeight);
                }
                actualPoints = PolyShapeModel.convertNumberArrayToString(actualPoints);

                // Set clamped points to a view in order to get an updated bounding box for a poly shape
                this._shapeView.attr('points', window.cvat.translate.points.actualToCanvas(actualPoints));

                // Get an updated bounding box for check it area
                let polybox = this._shapeView.node.getBBox();
                let w = polybox.width;
                let h = polybox.height;
                let area = w * h;
                let type = this._shape.type;

                if (area >= AREA_TRESHOLD || type === 'points' || type === 'polyline' && (w >= AREA_TRESHOLD || h >= AREA_TRESHOLD)) {
                    this._controller.pasteToFrame(e, null, actualPoints);
                }
                else {
                    this._controller.pasteToFrame(e, null, null);
                }
            }
            else {
                let frameWidth = window.cvat.player.geometry.frameWidth;
                let frameHeight = window.cvat.player.geometry.frameHeight;
                let rect = window.cvat.translate.box.canvasToActual(this._shapeView.node.getBBox());
                let box = {};
                box.xtl = Math.clamp(rect.x, 0, frameWidth);
                box.ytl = Math.clamp(rect.y, 0, frameHeight);
                box.xbr = Math.clamp(rect.x + rect.width, 0, frameWidth);
                box.ybr = Math.clamp(rect.y + rect.height, 0, frameHeight);

                if ((box.xbr - box.xtl) * (box.ybr - box.ytl) >= AREA_TRESHOLD) {
                    this._controller.pasteToFrame(e, box, null);
                }
                else {
                    this._controller.pasteToFrame(e, null, null);
                }
            }
        });

        this._frameContent.on('mouseleave.buffer', () => {
            this._shapeView.style('visibility', 'hidden');
        });
    }

    _disableEvents() {
        this._frameContent.off('mousemove.buffer');
        this._frameContent.off('mousedown.buffer');
        this._frameContent.off('mouseleave.buffer');
    }

    onShapeBufferUpdate(buffer) {
        if (buffer.pasteMode) {
            this._shape = buffer.shape;
            this._drawShapeView();
            this._enableEvents();
        }
        else {
            if (this._shapeView) {
                this._disableEvents();
                this._removeShapeView();
            }
        }
    }

    onBufferUpdate(buffer) {
        if (buffer.pasteMode && !this._pasteMode) {
            this._pasteMode = true;
            this._shape = buffer.shape;
            this.enableMouseEvents();
        }
        else if (!buffer.pasteMode) {
            this.disableMouseEvents();
            if (this._viewShape) {
                this._viewShape.remove();
            }
            this._viewShape = null;
            this._shape = null;
            this._pasteMode = false;
        }
    }

    onPlayerUpdate(player) {
        if (!player.ready()) return;
        if (this._shapeView != null && this._shape.type != 'points') {
            this._shapeView.attr('stroke-width', STROKE_WIDTH / player.geometry.scale);
        }
    }
}

;/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported ShapeGrouperModel ShapeGrouperController ShapeGrouperView*/

/* global
    Listener:false
    Logger:false
    Mousetrap:false
    STROKE_WIDTH:false
*/

"use strict";

class ShapeGrouperModel extends Listener {
    constructor(shapeCollection) {
        super('onGrouperUpdate', () => this);

        this._shapeCollection = shapeCollection;
        this._active = false;
        this._selectedObjects = [];
    }

    _unselectObjects() {
        for (let obj of this._selectedObjects) {
            obj.groupping = false;
        }
        this._selectedObjects = [];
    }

    apply() {
        if (this._selectedObjects.length) {
            this._shapeCollection.joinToGroup(this._selectedObjects);
        }
    }

    reset() {
        if (this._selectedObjects.length) {
            this._shapeCollection.resetGroupFor(this._selectedObjects);
        }
    }

    cancel() {
        if (this._active) {
            this._unselectObjects();

            this._active = false;
            if (window.cvat.mode === 'groupping') {
                window.cvat.mode = null;
            }
            this.notify();
        }
    }

    switch() {
        if (this._active) {
            this.apply();
            this.cancel();
        }
        else if (window.cvat.mode === null) {
            window.cvat.mode = 'groupping';
            this._active = true;
            this._shapeCollection.resetActive();
            this.notify();
        }
    }

    add(model) {
        let idx = this._selectedObjects.indexOf(model);
        if (idx === -1) {
            this._selectedObjects.push(model);
            model.groupping = true;
        }
    }

    click() {
        if (this._active) {
            let active = this._shapeCollection.selectShape(this._shapeCollection.lastPosition, true);
            if (active) {
                let idx = this._selectedObjects.indexOf(active);
                if (idx != -1) {
                    this._selectedObjects.splice(idx, 1);
                    active.groupping = false;
                }
                else {
                    this._selectedObjects.push(active);
                    active.groupping = true;
                }
            }
        }
    }

    onCollectionUpdate() {
        if (this._active) {
            this._unselectObjects();
        }
    }

    get active() {
        return this._active;
    }
}


class ShapeGrouperController {
    constructor(grouperModel) {
        this._model = grouperModel;

        setupGrouperShortkeys.call(this);
        function setupGrouperShortkeys() {
            let shortkeys = window.cvat.config.shortkeys;

            let switchGrouperHandler = Logger.shortkeyLogDecorator(function() {
                this.switch();
            }.bind(this));

            let resetGroupHandler = Logger.shortkeyLogDecorator(function() {
                if (this._model.active) {
                    this._model.reset();
                    this._model.cancel();
                    this._model.notify();
                }
            }.bind(this));

            Mousetrap.bind(shortkeys["switch_group_mode"].value, switchGrouperHandler.bind(this), 'keydown');
            Mousetrap.bind(shortkeys["reset_group"].value, resetGroupHandler.bind(this), 'keydown');
        }
    }

    switch() {
        this._model.switch();
    }

    add(model) {
        this._model.add(model);
    }

    click() {
        this._model.click();
    }
}


class ShapeGrouperView {
    constructor(grouperModel, grouperController) {
        this._controller = grouperController;
        this._frameContent = $('#frameContent');
        this._groupShapesButton = $('#groupShapesButton');
        this._rectSelector = null;
        this._initPoint = null;
        this._scale = 1;

        this._groupShapesButton.on('click', () => {
            this._controller.switch();
        });

        let shortkeys = window.cvat.config.shortkeys;

        this._groupShapesButton.attr('title', `
            ${shortkeys['switch_group_mode'].view_value} - ${shortkeys['switch_group_mode'].description}` + `\n` +
            `${shortkeys['reset_group'].view_value} - ${shortkeys['reset_group'].description}`);

        grouperModel.subscribe(this);
    }

    _select() {
        if (this._rectSelector) {
            let rect1 = this._rectSelector[0].getBBox();
            for (let shape of this._frameContent.find('.shape')) {
                let rect2 = shape.getBBox();

                if (rect1.x < rect2.x && rect1.y < rect2.y &&
                    rect1.x + rect1.width > rect2.x + rect2.width &&
                    rect1.y + rect1.height > rect2.y + rect2.height) {
                    this._controller.add(shape.cvatView.controller().model());
                }
            }
        }
    }

    _reset() {
        if (this._rectSelector) {
            this._rectSelector.remove();
            this._rectSelector = null;
        }

        if (this._initPoint) {
            this._initPoint = null;
        }
    }

    _enableEvents() {
        this._frameContent.on('mousedown.grouper', (e) => {
            this._initPoint = window.cvat.translate.point.clientToCanvas(this._frameContent[0], e.clientX, e.clientY);
        });

        this._frameContent.on('mousemove.grouper', (e) => {
            let currentPoint = window.cvat.translate.point.clientToCanvas(this._frameContent[0], e.clientX, e.clientY);

            if (this._initPoint) {
                if (!this._rectSelector) {
                    this._rectSelector = $(document.createElementNS('http://www.w3.org/2000/svg', 'rect'));
                    this._rectSelector.appendTo(this._frameContent);
                    this._rectSelector.attr({
                        'stroke-width': (STROKE_WIDTH / 3) / this._scale,
                        'stroke': 'darkmagenta',
                        'fill': 'darkmagenta',
                        'fill-opacity': 0.5,
                        'stroke-dasharray': 5,
                    });
                }

                this._rectSelector.attr({
                    'x': Math.min(this._initPoint.x, currentPoint.x),
                    'y': Math.min(this._initPoint.y, currentPoint.y),
                    'width': Math.max(this._initPoint.x, currentPoint.x) - Math.min(this._initPoint.x, currentPoint.x),
                    'height': Math.max(this._initPoint.y, currentPoint.y) - Math.min(this._initPoint.y, currentPoint.y),
                });
            }
        });

        this._frameContent.on('mouseup.grouper', () => {
            this._select();
            this._reset();
        });

        this._frameContent.on('mouseleave.grouper', () => {
            this._select();
            this._reset();
        });

        this._frameContent.on('click.grouper', () => {
            this._controller.click();
        });
    }

    _disableEvents() {
        this._frameContent.off('mousedown.grouper');
        this._frameContent.off('mousemove.grouper');
        this._frameContent.off('mouseup.grouper');
        this._frameContent.off('mouseleave.grouper');
        this._frameContent.off('click.grouper');
    }

    onGrouperUpdate(grouper) {
        if (grouper.active) {
            this._enableEvents();
            this._groupShapesButton.text('Apply Group');
        }
        else {
            this._reset();
            this._disableEvents();
            this._groupShapesButton.text('Group Shapes');
            if (this._rectSelector) {
                this._rectSelector.remove();
                this._rectSelector = null;
            }
        }
    }

    onPlayerUpdate(player) {
        if (this._scale != player.geometry.scale) {
            this._scale = player.geometry.scale;
            if (this._rectSelector) {
                this._rectSelector.attr({
                    'stroke-width': STROKE_WIDTH / this._scale,
                });
            }
        }
    }
}

;/* exported buildAnnotationSaver */

/* global
    showOverlay:false
    showMessage:false
    Listener:false
    Logger:false
    Mousetrap:false
*/


class AnnotationSaverModel extends Listener {
    constructor(initialData, shapeCollection) {
        super('onAnnotationSaverUpdate', () => this._state);

        this._state = {
            status: null,
            message: null,
        };

        this._version = initialData.version;
        this._shapeCollection = shapeCollection;
        this._initialObjects = {};

        this._resetState();
        this.update();

        // We need use data from export instead of initialData
        // Otherwise we have differ keys order and JSON comparison code incorrect
        const data = this._shapeCollection.export()[0];
        for (const shape of data.shapes) {
            this._initialObjects.shapes[shape.id] = shape;
        }

        for (const track of data.tracks) {
            this._initialObjects.tracks[track.id] = track;
        }
    }

    _resetState() {
        this._initialObjects = {
            shapes: {},
            tracks: {},
        };
    }

    update() {
        this._hash = this._getHash();
    }

    async _request(data, action) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/api/v1/jobs/${window.cvat.job.id}/annotations?action=${action}`,
                type: 'PATCH',
                data: JSON.stringify(data),
                contentType: 'application/json',
            }).done((savedData) => {
                resolve(savedData);
            }).fail((errorData) => {
                const message = `Could not make ${action} annotations. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                reject(new Error(message));
            });
        });
    }

    async _put(data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/api/v1/jobs/${window.cvat.job.id}/annotations`,
                type: 'PUT',
                data: JSON.stringify(data),
                contentType: 'application/json',
            }).done((savedData) => {
                resolve(savedData);
            }).fail((errorData) => {
                const message = `Could not put annotations. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                reject(new Error(message));
            });
        });
    }

    async _create(created) {
        return this._request(created, 'create');
    }

    async _update(updated) {
        return this._request(updated, 'update');
    }

    async _delete(deleted) {
        return this._request(deleted, 'delete');
    }

    async _logs() {
        Logger.addEvent(Logger.EventType.saveJob);
        const totalStat = this._shapeCollection.collectStatistic()[1];
        Logger.addEvent(Logger.EventType.sendTaskInfo, {
            'track count': totalStat.boxes.annotation + totalStat.boxes.interpolation
                + totalStat.polygons.annotation + totalStat.polygons.interpolation
                + totalStat.polylines.annotation + totalStat.polylines.interpolation
                + totalStat.points.annotation + totalStat.points.interpolation,
            'frame count': window.cvat.player.frames.stop - window.cvat.player.frames.start + 1,
            'object count': totalStat.total,
            'box count': totalStat.boxes.annotation + totalStat.boxes.interpolation,
            'polygon count': totalStat.polygons.annotation + totalStat.polygons.interpolation,
            'polyline count': totalStat.polylines.annotation + totalStat.polylines.interpolation,
            'points count': totalStat.points.annotation + totalStat.points.interpolation,
        });

        const annotationLogs = Logger.getLogs();

        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/api/v1/server/logs',
                type: 'POST',
                data: JSON.stringify(annotationLogs.export()),
                contentType: 'application/json',
            }).done(() => {
                resolve();
            }).fail((errorData) => {
                annotationLogs.save();
                const message = `Could not send logs. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                reject(new Error(message));
            });
        });
    }

    _split(exported) {
        const created = {
            version: this._version,
            shapes: [],
            tracks: [],
            tags: [],
        };

        const updated = {
            version: this._version + 1,
            shapes: [],
            tracks: [],
            tags: [],
        };

        const deleted = {
            version: this._version + 2,
            shapes: [],
            tracks: [],
            tags: [],
        };

        const keys = ['id', 'label_id', 'group', 'frame',
            'occluded', 'z_order', 'points', 'type', 'shapes',
            'attributes', 'value', 'spec_id', 'outside'];

        // Compare initial state objects and export state objects
        // in order to get updated and created objects
        for (const type of Object.keys(this._initialObjects)) {
            for (const obj of exported[type]) {
                if (obj.id in this._initialObjects[type]) {
                    const exportedHash = JSON.stringify(obj, keys);
                    const initialHash = JSON.stringify(this._initialObjects[type][obj.id], keys);
                    if (exportedHash !== initialHash) {
                        updated[type].push(obj);
                    }
                } else if (typeof obj.id === 'undefined') {
                    created[type].push(obj);
                } else {
                    throw Error(`Bad object ID found: ${obj.id}. `
                        + 'It is not contained in initial state and have server ID');
                }
            }
        }

        const indexes = {
            shapes: exported.shapes.map((object) => +object.id),
            tracks: exported.tracks.map((object) => +object.id),
        };

        // Compare initial state indexes and export state indexes
        // in order to get removed objects
        for (const type of Object.keys(this._initialObjects)) {
            for (const shapeID in this._initialObjects[type]) {
                if (!indexes[type].includes(+shapeID)) {
                    const object = this._initialObjects[type][shapeID];
                    deleted[type].push(object);
                }
            }
        }

        return [created, updated, deleted];
    }

    _getHash() {
        const exported = this._shapeCollection.export()[0];
        return JSON.stringify(exported);
    }

    _updateCreatedObjects(objectsToSave, savedObjects, mapping) {
        // Method setups IDs of created objects after saving on a server
        const allSavedObjects = savedObjects.shapes.concat(savedObjects.tracks);
        const allObjectsToSave = objectsToSave.shapes.concat(objectsToSave.tracks);
        if (allSavedObjects.length !== allObjectsToSave.length) {
            throw Error('Number of saved objects and objects to save is not match');
        }

        for (let idx = 0; idx < allSavedObjects.length; idx += 1) {
            const objectModel = mapping.filter(el => el[0] === allObjectsToSave[idx])[0][1];
            const { id } = allSavedObjects[idx];
            objectModel.serverID = id;
            allObjectsToSave[idx].id = id;
        }

        this._shapeCollection.update();
    }

    notify(status, message = null) {
        this._state.status = status;
        this._state.message = message;
        Listener.prototype.notify.call(this);
    }

    hasUnsavedChanges() {
        return this._getHash() !== this._hash;
    }

    async save() {
        this.notify('saveStart');
        try {
            const [exported, mapping] = this._shapeCollection.export();
            const { flush } = this._shapeCollection;
            if (flush) {
                const data = Object.assign({}, exported, {
                    version: this._version,
                    tags: [],
                });

                this._version += 1;

                this.notify('saveCreated');
                const savedObjects = await this._put(data);
                this._updateCreatedObjects(exported, savedObjects, mapping);
                this._shapeCollection.flush = false;
                this._version = savedObjects.version;
                this._resetState();

                for (const type of Object.keys(this._initialObjects)) {
                    for (const object of savedObjects[type]) {
                        if (object.shapes) {
                            for (const shape of object.shapes) {
                                delete shape.id;
                            }
                        }
                        this._initialObjects[type][object.id] = object;
                    }
                }

                this._version = savedObjects.version;
            } else {
                const [created, updated, deleted] = this._split(exported);
                this.notify('saveCreated');
                const savedCreated = await this._create(created);
                this._updateCreatedObjects(created, savedCreated, mapping);
                this._version = savedCreated.version;

                for (const type of Object.keys(this._initialObjects)) {
                    for (const object of savedCreated[type]) {
                        if (object.shapes) {
                            for (const shape of object.shapes) {
                                delete shape.id;
                            }
                        }
                        this._initialObjects[type][object.id] = object;
                    }
                }

                this.notify('saveUpdated');
                const savedUpdated = await this._update(updated);
                this._version = savedUpdated.version;
                for (const type of Object.keys(this._initialObjects)) {
                    for (const object of savedUpdated[type]) {
                        if (object.shapes) {
                            for (const shape of object.shapes) {
                                delete shape.id;
                            }
                        }
                        this._initialObjects[type][object.id] = object;
                    }
                }

                this.notify('saveDeleted');
                const savedDeleted = await this._delete(deleted);
                this._version = savedDeleted.version;
                for (const type of Object.keys(this._initialObjects)) {
                    for (const object of savedDeleted[type]) {
                        delete this._initialObjects[type][object.id];
                    }
                }

                this._version = savedDeleted.version;
            }

            await this._logs();
        } catch (error) {
            this.notify('saveUnlocked');
            this.notify('saveError', error.message);
            this._state = {
                status: null,
                message: null,
            };
            throw Error(error);
        }

        this._hash = this._getHash();
        this.notify('saveDone');

        setTimeout(() => {
            this.notify('saveUnlocked');
            this._state = {
                status: null,
                message: null,
            };
        }, 1000);
    }

    get state() {
        return JSON.parse(JSON.stringify(this._state));
    }
}

class AnnotationSaverController {
    constructor(model) {
        this._model = model;
        this._autoSaveInterval = null;

        const { shortkeys } = window.cvat.config;
        Mousetrap.bind(shortkeys.save_work.value, () => {
            this.save();
            return false;
        }, 'keydown');
    }

    autoSave(enabled, time) {
        if (this._autoSaveInterval) {
            clearInterval(this._autoSaveInterval);
            this._autoSaveInterval = null;
        }

        if (enabled) {
            this._autoSaveInterval = setInterval(() => {
                this.save();
            }, time * 1000 * 60);
        }
    }

    hasUnsavedChanges() {
        return this._model.hasUnsavedChanges();
    }

    save() {
        if (this._model.state.status === null) {
            this._model.save().catch((error) => {
                setTimeout(() => {
                    throw error;
                });
            });
        }
    }
}


class AnnotationSaverView {
    constructor(model, controller) {
        model.subscribe(this);

        this._controller = controller;
        this._overlay = null;

        const { shortkeys } = window.cvat.config;
        const saveHelp = `${shortkeys.save_work.view_value} - ${shortkeys.save_work.description}`;

        this._saveButton = $('#saveButton').on('click', () => {
            this._controller.save();
        }).attr('title', saveHelp);

        this._autoSaveBox = $('#autoSaveBox').on('change', (e) => {
            const enabled = e.target.checked;
            const time = +this._autoSaveTime.prop('value');
            this._controller.autoSave(enabled, time);
        });

        this._autoSaveTime = $('#autoSaveTime').on('change', (e) => {
            e.target.value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
            this._autoSaveBox.trigger('change');
        });

        window.onbeforeunload = (e) => {
            if (this._controller.hasUnsavedChanges()) {
                const message = 'You have unsaved changes. Leave this page?';
                e.returnValue = message;
                return message;
            }
            return null;
        };
    }

    onAnnotationSaverUpdate(state) {
        if (state.status === 'saveStart') {
            this._overlay = showOverlay('Annotations are being saved..');
            this._saveButton.prop('disabled', true).text('Saving..');
        } else if (state.status === 'saveDone') {
            this._saveButton.text('Successful save');
            this._overlay.remove();
        } else if (state.status === 'saveError') {
            this._saveButton.prop('disabled', false).text('Save Work');
            const message = `Couldn't to save the job. Errors occured: ${state.message}. `
                + 'Please report the problem to support team immediately.';
            showMessage(message);
            this._overlay.remove();
        } else if (state.status === 'saveCreated') {
            this._overlay.setMessage(`${this._overlay.getMessage()} <br /> - Created objects are being saved..`);
        } else if (state.status === 'saveUpdated') {
            this._overlay.setMessage(`${this._overlay.getMessage()} <br /> - Updated objects are being saved..`);
        } else if (state.status === 'saveDeleted') {
            this._overlay.setMessage(`${this._overlay.getMessage()} <br /> - Deleted objects are being saved..`);
        } else if (state.status === 'saveUnlocked') {
            this._saveButton.prop('disabled', false).text('Save Work');
        } else {
            const message = `Unknown state has been reached during annotation saving: ${state.status} `
                + 'Please report the problem to support team immediately.';
            showMessage(message);
        }
    }
}


function buildAnnotationSaver(initialData, shapeCollection) {
    const model = new AnnotationSaverModel(initialData, shapeCollection);
    const controller = new AnnotationSaverController(model);
    new AnnotationSaverView(model, controller);
    return model;
}

;/*
 * Copyright (C) 2018-2019 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported callAnnotationUI blurAllElements drawBoxSize copyToClipboard */

/* global
    AAMController:false
    AAMModel:false
    AAMView:false
    AnnotationParser:false
    Config:false
    userConfirm:false
    CoordinateTranslator:false
    dumpAnnotationRequest:false
    HistoryController:false
    HistoryModel:false
    HistoryView:false
    Logger:false
    Mousetrap:false
    PlayerController:false
    PlayerModel:false
    PlayerView:false
    PolyshapeEditorController:false
    PolyshapeEditorModel:false
    PolyshapeEditorView:false
    PolyShapeView:false
    ShapeBufferController:false
    ShapeBufferModel:false
    ShapeBufferView:false
    ShapeCollectionController:false
    ShapeCollectionModel:false
    ShapeCollectionView:false
    ShapeCreatorController:false
    ShapeCreatorModel:false
    ShapeCreatorView:false
    ShapeGrouperController:false
    ShapeGrouperModel:false
    ShapeGrouperView:false
    ShapeMergerController:false
    ShapeMergerModel:false
    ShapeMergerView:false
    showMessage:false
    buildAnnotationSaver:false
    LabelsInfo:false
    uploadJobAnnotationRequest:false
    isDefaultFormat:false
*/

async function initLogger(jobID) {
    if (!Logger.initializeLogger(jobID)) {
        const message = 'Logger has been already initialized';
        console.error(message);
        showMessage(message);
        return;
    }

    Logger.setTimeThreshold(Logger.EventType.zoomImage);
}


function blurAllElements() {
    document.activeElement.blur();
}

function uploadAnnotation(jobId, shapeCollectionModel, historyModel, annotationSaverModel,
    uploadAnnotationButton, format) {
    $('#annotationFileSelector').attr('accept', `.${format.format}`);
    $('#annotationFileSelector').one('change', async (changedFileEvent) => {
        const file = changedFileEvent.target.files['0'];
        changedFileEvent.target.value = '';
        if (!file) return;
        uploadAnnotationButton.prop('disabled', true);
        const annotationData = new FormData();
        annotationData.append('annotation_file', file);
        try {
            await uploadJobAnnotationRequest(jobId, annotationData, format.display_name);
            historyModel.empty();
            shapeCollectionModel.empty();
            const data = await $.get(`/api/v1/jobs/${jobId}/annotations`);
            shapeCollectionModel.import(data);
            shapeCollectionModel.update();
            annotationSaverModel.update();
        } catch (error) {
            showMessage(error.message);
        } finally {
            uploadAnnotationButton.prop('disabled', false);
        }
    }).click();
}


function setupFrameFilters() {
    const brightnessRange = $('#playerBrightnessRange');
    const contrastRange = $('#playerContrastRange');
    const saturationRange = $('#playerSaturationRange');
    const frameBackground = $('#frameBackground');
    const reset = $('#resetPlayerFilterButton');
    let brightness = 100;
    let contrast = 100;
    let saturation = 100;

    const { shortkeys } = window.cvat.config;

    function updateFilterParameters() {
        frameBackground.css('filter', `contrast(${contrast}%) brightness(${brightness}%) saturate(${saturation}%)`);
    }

    brightnessRange.attr('title', `
        ${shortkeys.change_player_brightness.view_value} - ${shortkeys.change_player_brightness.description}`);
    contrastRange.attr('title', `
        ${shortkeys.change_player_contrast.view_value} - ${shortkeys.change_player_contrast.description}`);
    saturationRange.attr('title', `
        ${shortkeys.change_player_saturation.view_value} - ${shortkeys.change_player_saturation.description}`);

    const changeBrightnessHandler = Logger.shortkeyLogDecorator((e) => {
        if (e.shiftKey) {
            brightnessRange.prop('value', brightness + 10).trigger('input');
        } else {
            brightnessRange.prop('value', brightness - 10).trigger('input');
        }
    });

    const changeContrastHandler = Logger.shortkeyLogDecorator((e) => {
        if (e.shiftKey) {
            contrastRange.prop('value', contrast + 10).trigger('input');
        } else {
            contrastRange.prop('value', contrast - 10).trigger('input');
        }
    });

    const changeSaturationHandler = Logger.shortkeyLogDecorator((e) => {
        if (e.shiftKey) {
            saturationRange.prop('value', saturation + 10).trigger('input');
        } else {
            saturationRange.prop('value', saturation - 10).trigger('input');
        }
    });

    Mousetrap.bind(shortkeys.change_player_brightness.value, changeBrightnessHandler, 'keydown');
    Mousetrap.bind(shortkeys.change_player_contrast.value, changeContrastHandler, 'keydown');
    Mousetrap.bind(shortkeys.change_player_saturation.value, changeSaturationHandler, 'keydown');

    reset.on('click', () => {
        brightness = 100;
        contrast = 100;
        saturation = 100;
        brightnessRange.prop('value', brightness);
        contrastRange.prop('value', contrast);
        saturationRange.prop('value', saturation);
        updateFilterParameters();
    });

    brightnessRange.on('input', (e) => {
        const value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        e.target.value = value;
        brightness = value;
        updateFilterParameters();
    });

    contrastRange.on('input', (e) => {
        const value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        e.target.value = value;
        contrast = value;
        updateFilterParameters();
    });

    saturationRange.on('input', (e) => {
        const value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        e.target.value = value;
        saturation = value;
        updateFilterParameters();
    });
}


function setupShortkeys(shortkeys, models) {
    const annotationMenu = $('#annotationMenu');
    const settingsWindow = $('#settingsWindow');
    const helpWindow = $('#helpWindow');

    Mousetrap.prototype.stopCallback = () => false;

    const openHelpHandler = Logger.shortkeyLogDecorator(() => {
        const helpInvisible = helpWindow.hasClass('hidden');
        if (helpInvisible) {
            annotationMenu.addClass('hidden');
            settingsWindow.addClass('hidden');
            helpWindow.removeClass('hidden');
        } else {
            helpWindow.addClass('hidden');
        }
        return false;
    });

    const openSettingsHandler = Logger.shortkeyLogDecorator(() => {
        const settingsInvisible = settingsWindow.hasClass('hidden');
        if (settingsInvisible) {
            annotationMenu.addClass('hidden');
            helpWindow.addClass('hidden');
            settingsWindow.removeClass('hidden');
        } else {
            $('#settingsWindow').addClass('hidden');
        }
        return false;
    });

    const cancelModeHandler = Logger.shortkeyLogDecorator(() => {
        switch (window.cvat.mode) {
        case 'aam':
            models.aam.switchAAMMode();
            break;
        case 'creation':
            models.shapeCreator.switchCreateMode(true);
            break;
        case 'merge':
            models.shapeMerger.cancel();
            break;
        case 'groupping':
            models.shapeGrouper.cancel();
            break;
        case 'paste':
            models.shapeBuffer.switchPaste();
            break;
        case 'poly_editing':
            models.shapeEditor.finish();
            break;
        default:
            break;
        }
        return false;
    });

    Mousetrap.bind(shortkeys.open_help.value, openHelpHandler, 'keydown');
    Mousetrap.bind(shortkeys.open_settings.value, openSettingsHandler, 'keydown');
    Mousetrap.bind(shortkeys.cancel_mode.value, cancelModeHandler, 'keydown');
}


function setupHelpWindow(shortkeys) {
    const closeHelpButton = $('#closeHelpButton');
    const helpTable = $('#shortkeyHelpTable');

    closeHelpButton.on('click', () => {
        $('#helpWindow').addClass('hidden');
    });

    for (const key in shortkeys) {
        if (Object.prototype.hasOwnProperty.call(shortkeys, key)) {
            helpTable.append($(`<tr> <td> ${shortkeys[key].view_value} </td> <td> ${shortkeys[key].description} </td> </tr>`));
        }
    }
}


function setupSettingsWindow() {
    const closeSettingsButton = $('#closeSettignsButton');

    closeSettingsButton.on('click', () => {
        $('#settingsWindow').addClass('hidden');
    });
}


function setupMenu(job, task, shapeCollectionModel,
    annotationParser, aamModel, playerModel, historyModel,
    annotationFormats, annotationSaverModel) {
    const annotationMenu = $('#annotationMenu');
    const menuButton = $('#menuButton');
    const downloadDropdownMenu = $('#downloadDropdownMenu');

    function hide() {
        annotationMenu.addClass('hidden');
        downloadDropdownMenu.addClass('hidden');
    }

    function setupVisibility() {
        let timer = null;
        menuButton.on('click', () => {
            const [byLabelsStat, totalStat] = shapeCollectionModel.collectStatistic();
            const table = $('#annotationStatisticTable');
            table.find('.temporaryStatisticRow').remove();

            for (const labelId in byLabelsStat) {
                if (Object.prototype.hasOwnProperty.call(byLabelsStat, labelId)) {
                    $(`<tr>
                    <td class="semiBold"> ${window.cvat.labelsInfo.labels()[labelId].normalize()} </td>
                    <td> ${byLabelsStat[labelId].boxes.annotation} </td>
                    <td> ${byLabelsStat[labelId].boxes.interpolation} </td>
                    <td> ${byLabelsStat[labelId].polygons.annotation} </td>
                    <td> ${byLabelsStat[labelId].polygons.interpolation} </td>
                    <td> ${byLabelsStat[labelId].polylines.annotation} </td>
                    <td> ${byLabelsStat[labelId].polylines.interpolation} </td>
                    <td> ${byLabelsStat[labelId].points.annotation} </td>
                    <td> ${byLabelsStat[labelId].points.interpolation} </td>
                    <td> ${byLabelsStat[labelId].manually} </td>
                    <td> ${byLabelsStat[labelId].interpolated} </td>
                    <td class="semiBold"> ${byLabelsStat[labelId].total} </td>
                </tr>`).addClass('temporaryStatisticRow').appendTo(table);
                }
            }

            $(`<tr class="semiBold">
                <td> Total: </td>
                <td> ${totalStat.boxes.annotation} </td>
                <td> ${totalStat.boxes.interpolation} </td>
                <td> ${totalStat.polygons.annotation} </td>
                <td> ${totalStat.polygons.interpolation} </td>
                <td> ${totalStat.polylines.annotation} </td>
                <td> ${totalStat.polylines.interpolation} </td>
                <td> ${totalStat.points.annotation} </td>
                <td> ${totalStat.points.interpolation} </td>
                <td> ${totalStat.manually} </td>
                <td> ${totalStat.interpolated} </td>
                <td> ${totalStat.total} </td>
            </tr>`).addClass('temporaryStatisticRow').appendTo(table);
        });

        menuButton.on('click', () => {
            annotationMenu.removeClass('hidden');
            annotationMenu.css('top', `${menuButton.offset().top - annotationMenu.height() - menuButton.height()}px`);
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            timer = setTimeout(hide, 1000);
        });

        annotationMenu.on('mouseout', () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            timer = setTimeout(hide, 500);
        });

        annotationMenu.on('mouseover', () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        });
    }

    setupVisibility();

    $('#statTaskName').text(task.name);
    $('#statFrames').text(`[${window.cvat.player.frames.start}-${window.cvat.player.frames.stop}]`);
    $('#statOverlap').text(task.overlap);
    $('#statZOrder').text(task.z_order);
    $('#statTaskStatus').prop('value', job.status).on('change', async (e) => {
        try {
            const jobCopy = JSON.parse(JSON.stringify(job));
            jobCopy.status = e.target.value;

            await $.ajax({
                url: `/api/v1/jobs/${window.cvat.job.id}`,
                type: 'PATCH',
                data: JSON.stringify(jobCopy),
                contentType: 'application/json',
            });
        } catch (errorData) {
            const message = `Can not update a job status. Code: ${errorData.status}. `
                + `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        }
    });

    const { shortkeys } = window.cvat.config;
    $('#helpButton').on('click', () => {
        hide();
        $('#helpWindow').removeClass('hidden');
    });

    $('#helpButton').attr('title', `
        ${shortkeys.open_help.view_value} - ${shortkeys.open_help.description}`);

    $('#settingsButton').on('click', () => {
        hide();
        $('#settingsWindow').removeClass('hidden');
    });

    $('#openTaskButton').on('click', () => {
        const win = window.open(
            `${window.UI_URL}/tasks/${window.cvat.job.task_id}`, '_blank'
        );
        win.focus();
    });

    $('#settingsButton').attr('title', `
        ${shortkeys.open_settings.view_value} - ${shortkeys.open_settings.description}`);

    const downloadButton = $('#downloadAnnotationButton');
    const uploadButton = $('#uploadAnnotationButton');

    const loaders = {};

    for (const format of annotationFormats) {
        for (const dumper of format.dumpers) {
            const item = $(`<option>${dumper.display_name}</li>`);

            if (!isDefaultFormat(dumper.display_name, window.cvat.job.mode)) {
                item.addClass('regular');
            }

            item.appendTo(downloadButton);
        }

        for (const loader of format.loaders) {
            loaders[loader.display_name] = loader;
            $(`<option class="regular">${loader.display_name}</li>`).appendTo(uploadButton);
        }
    }

    downloadButton.on('change', async (e) => {
        const dumper = e.target.value;
        downloadButton.prop('value', 'Dump Annotation');
        try {
            downloadButton.prop('disabled', true);
            await dumpAnnotationRequest(task.id, task.name, dumper);
        } catch (error) {
            showMessage(error.message);
        } finally {
            downloadButton.prop('disabled', false);
        }
    });

    uploadButton.on('change', (e) => {
        const loader = loaders[e.target.value];
        uploadButton.prop('value', 'Upload Annotation');
        userConfirm('Current annotation will be removed from the client. Continue?',
            async () => {
                try {
                    await uploadAnnotation(
                        job.id,
                        shapeCollectionModel,
                        historyModel,
                        annotationSaverModel,
                        $('#uploadAnnotationButton'),
                        loader,
                    );
                } catch (error) {
                    showMessage(error.message);
                }
            });
    });

    $('#removeAnnotationButton').on('click', () => {
        if (!window.cvat.mode) {
            hide();
            userConfirm('Do you want to remove all annotations? The action cannot be undone!',
                () => {
                    historyModel.empty();
                    shapeCollectionModel.empty();
                });
        }
    });

    // JS function cancelFullScreen don't work after pressing
    // and it is famous problem.
    $('#fullScreenButton').on('click', () => {
        $('#playerFrame').toggleFullScreen();
    });

    $('#playerFrame').on('fullscreenchange webkitfullscreenchange mozfullscreenchange', () => {
        playerModel.updateGeometry({
            width: $('#playerFrame').width(),
            height: $('#playerFrame').height(),
        });
        playerModel.fit();
    });

    $('#switchAAMButton').on('click', () => {
        hide();
        aamModel.switchAAMMode();
    });

    $('#switchAAMButton').attr('title', `
        ${shortkeys.switch_aam_mode.view_value} - ${shortkeys.switch_aam_mode.description}`);
}


function buildAnnotationUI(jobData, taskData, imageMetaData, annotationData, annotationFormats,
    loadJobEvent) {
    // Setup some API
    window.cvat = {
        labelsInfo: new LabelsInfo(taskData.labels),
        translate: new CoordinateTranslator(),
        player: {
            geometry: {
                scale: 1,
            },
            frames: {
                current: jobData.start_frame,
                start: jobData.start_frame,
                stop: jobData.stop_frame,
            },
        },
        mode: null,
        job: {
            z_order: taskData.z_order,
            id: jobData.id,
            task_id: taskData.id,
            mode: taskData.mode,
            images: imageMetaData,
        },
        search: {
            value: window.location.search,

            set(name, value) {
                const searchParams = new URLSearchParams(this.value);

                if (typeof value === 'undefined' || value === null) {
                    if (searchParams.has(name)) {
                        searchParams.delete(name);
                    }
                } else {
                    searchParams.set(name, value);
                }
                this.value = `${searchParams.toString()}`;
            },

            get(name) {
                try {
                    const decodedURI = decodeURIComponent(this.value);
                    const urlSearchParams = new URLSearchParams(decodedURI);
                    if (urlSearchParams.has(name)) {
                        return urlSearchParams.get(name);
                    }
                    return null;
                } catch (error) {
                    showMessage('Bad URL has been received');
                    this.value = window.location.href;
                    return null;
                }
            },

            toString() {
                return `${window.location.origin}/?${this.value}`;
            },
        },
    };

    // Remove external search parameters from url
    window.history.replaceState(null, null, `${window.location.origin}/?id=${jobData.id}`);

    window.cvat.config = new Config();

    // Setup components
    const annotationParser = new AnnotationParser({
        start: window.cvat.player.frames.start,
        stop: window.cvat.player.frames.stop,
        flipped: taskData.flipped,
        image_meta_data: imageMetaData,
    }, window.cvat.labelsInfo);

    const shapeCollectionModel = new ShapeCollectionModel().import(annotationData);
    const shapeCollectionController = new ShapeCollectionController(shapeCollectionModel);
    const shapeCollectionView = new ShapeCollectionView(shapeCollectionModel,
        shapeCollectionController);

    const annotationSaverModel = buildAnnotationSaver(annotationData, shapeCollectionModel);

    window.cvat.data = {
        get: () => shapeCollectionModel.export()[0],
        set: (data) => {
            shapeCollectionModel.import(data);
            shapeCollectionModel.update();
        },
        clear: () => shapeCollectionModel.empty(),
    };

    const shapeBufferModel = new ShapeBufferModel(shapeCollectionModel);
    const shapeBufferController = new ShapeBufferController(shapeBufferModel);
    const shapeBufferView = new ShapeBufferView(shapeBufferModel, shapeBufferController);

    $('#shapeModeSelector').prop('value', taskData.mode);
    const shapeCreatorModel = new ShapeCreatorModel(shapeCollectionModel);
    const shapeCreatorController = new ShapeCreatorController(shapeCreatorModel);
    const shapeCreatorView = new ShapeCreatorView(shapeCreatorModel, shapeCreatorController);

    const polyshapeEditorModel = new PolyshapeEditorModel(shapeCollectionModel);
    const polyshapeEditorController = new PolyshapeEditorController(polyshapeEditorModel);
    const polyshapeEditorView = new PolyshapeEditorView(polyshapeEditorModel,
        polyshapeEditorController);

    // Add static member for class. It will be used by all polyshapes.
    PolyShapeView.editor = polyshapeEditorModel;

    const shapeMergerModel = new ShapeMergerModel(shapeCollectionModel);
    const shapeMergerController = new ShapeMergerController(shapeMergerModel);
    new ShapeMergerView(shapeMergerModel, shapeMergerController);

    const shapeGrouperModel = new ShapeGrouperModel(shapeCollectionModel);
    const shapeGrouperController = new ShapeGrouperController(shapeGrouperModel);
    const shapeGrouperView = new ShapeGrouperView(shapeGrouperModel, shapeGrouperController);

    const playerGeometry = {
        width: $('#playerFrame').width(),
        height: $('#playerFrame').height(),
    };

    const playerModel = new PlayerModel(taskData, playerGeometry);
    const playerController = new PlayerController(playerModel,
        () => shapeCollectionModel.activeShape,
        direction => shapeCollectionModel.find(direction),
        Object.assign({}, playerGeometry, {
            left: $('#playerFrame').offset().left,
            top: $('#playerFrame').offset().top,
        }));
    new PlayerView(playerModel, playerController);


    const aamModel = new AAMModel(shapeCollectionModel, (xtl, xbr, ytl, ybr) => {
        playerModel.focus(xtl, xbr, ytl, ybr);
    }, () => {
        playerModel.fit();
    });
    const aamController = new AAMController(aamModel);
    new AAMView(aamModel, aamController);

    shapeCreatorModel.subscribe(shapeCollectionModel);
    shapeGrouperModel.subscribe(shapeCollectionView);
    shapeCollectionModel.subscribe(shapeGrouperModel);

    $('#playerProgress').css('width', $('#player')['0'].clientWidth - 420);

    const historyModel = new HistoryModel(playerModel);
    const historyController = new HistoryController(historyModel);
    new HistoryView(historyController, historyModel);

    playerModel.subscribe(shapeCollectionModel);
    playerModel.subscribe(shapeCollectionView);
    playerModel.subscribe(shapeCreatorView);
    playerModel.subscribe(shapeBufferView);
    playerModel.subscribe(shapeGrouperView);
    playerModel.subscribe(polyshapeEditorView);
    playerModel.shift(window.cvat.search.get('frame') || 0, true);

    const { shortkeys } = window.cvat.config;

    setupHelpWindow(shortkeys);
    setupSettingsWindow();
    setupMenu(jobData, taskData, shapeCollectionModel,
        annotationParser, aamModel, playerModel, historyModel,
        annotationFormats, annotationSaverModel);
    setupFrameFilters();
    setupShortkeys(shortkeys, {
        aam: aamModel,
        shapeCreator: shapeCreatorModel,
        shapeMerger: shapeMergerModel,
        shapeGrouper: shapeGrouperModel,
        shapeBuffer: shapeBufferModel,
        shapeEditor: polyshapeEditorModel,
    });

    $(window).on('click', (event) => {
        Logger.updateUserActivityTimer();
        if (event.target.classList.contains('modal') && !event.target.classList.contains('force-modal')) {
            event.target.classList.add('hidden');
        }
    });

    const totalStat = shapeCollectionModel.collectStatistic()[1];
    loadJobEvent.addValues({
        'track count': totalStat.boxes.annotation + totalStat.boxes.interpolation
            + totalStat.polygons.annotation + totalStat.polygons.interpolation
            + totalStat.polylines.annotation + totalStat.polylines.interpolation
            + totalStat.points.annotation + totalStat.points.interpolation,
        'frame count': window.cvat.player.frames.stop - window.cvat.player.frames.start + 1,
        'object count': totalStat.total,
        'box count': totalStat.boxes.annotation + totalStat.boxes.interpolation,
        'polygon count': totalStat.polygons.annotation + totalStat.polygons.interpolation,
        'polyline count': totalStat.polylines.annotation + totalStat.polylines.interpolation,
        'points count': totalStat.points.annotation + totalStat.points.interpolation,
    });
    loadJobEvent.close();

    $('#player').on('click', (e) => {
        if (e.target.tagName.toLowerCase() !== 'input') {
            blurAllElements();
        }
    });
}


function callAnnotationUI(jid) {
    function onError(errorData) {
        $('body').empty();
        const message = `Can not build CVAT annotation UI. Code: ${errorData.status}. `
            + `Message: ${errorData.responseText || errorData.statusText}`;
        showMessage(message);
    }

    initLogger(jid);

    const loadJobEvent = Logger.addContinuedEvent(Logger.EventType.loadJob);
    $.get(`/api/v1/jobs/${jid}`).done((jobData) => {
        $.when(
            $.get(`/api/v1/tasks/${jobData.task_id}`),
            $.get(`/api/v1/tasks/${jobData.task_id}/frames/meta`),
            $.get(`/api/v1/jobs/${jid}/annotations`),
            $.get('/api/v1/server/annotation/formats'),
        ).then((taskData, imageMetaData, annotationData, annotationFormats) => {
            $('#loadingOverlay').remove();
            setTimeout(() => {
                buildAnnotationUI(jobData, taskData[0],
                    imageMetaData[0], annotationData[0], annotationFormats[0], loadJobEvent);
            });
        }).fail(onError);
    }).fail(onError);
}


function copyToClipboard(text) {
    const tempInput = $('<input>');
    $('body').append(tempInput);
    tempInput.prop('value', text).select();
    document.execCommand('copy');
    tempInput.remove();
}


function drawBoxSize(boxScene, textScene, box) {
    const clientBox = window.cvat.translate.box.canvasToClient(boxScene.node, box);
    const text = `${box.width.toFixed(1)}x${box.height.toFixed(1)}`;
    const obj = this && this.textUI && this.rm ? this : {
        textUI: textScene.text('').font({
            weight: 'bolder',
        }).fill('white'),

        rm() {
            if (this.textUI) {
                this.textUI.remove();
            }
        },
    };

    const textPoint = window.cvat.translate.point.clientToCanvas(textScene.node,
        clientBox.x, clientBox.y);

    obj.textUI.clear().plain(text);
    obj.textUI.addClass('shapeText');
    obj.textUI.move(textPoint.x, textPoint.y);

    return obj;
}
