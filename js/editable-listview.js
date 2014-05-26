/*!
 * jQuery Mobile Editable Listview Plugin
 * https://github.com/baig/jquerymobile-editablelistview
 *
 * Copyright 2014 (c) Wasif Hasan Baig
 *
 * Released under the MIT license
 * https://github.com/baig/jquerymobile-editablelistview/blob/master/LICENSE.txt
 */

(function ($, undefined) {

    "use strict";

    $.widget("mobile.listview", $.mobile.listview, {

        _created: false,
        _origDom: null,
        _editMode: false,
        _counter: 1,
        _dataItemName: "item",
        _itemNames: [],
        _evt: null,
        _clickHandler: null,

        options: {
            editable: false,
            editableType: 'simple',
            editableForm: '',

            listTitle: "View list items",
            listEmptyTitle: "No items to view",
            editLabel: "Edit",
            addLabel: "Add",
            doneLabel: "Done",
            addIcon: "plus",
            editIcon: "edit",
            doneIcon: "check",

            expandedIcon: "carat-d",
            collapsedIcon: "carat-r",
        },

        _beforeListviewRefresh: function () {
            var $el = this.element,
                opts = this.options,
                $origDom = this._origDom,
                dataItemName = this._dataItemName,
                counter = this._counter,
//                created = this._created,
//                editMode = this._editMode,
                ui, $orig, $origLis,
                evt = this._evt,
                $lis = $el.find("li"),
                $markup = this._$markup;

            // saving original DOM structure
            if ($origDom === null) {
                $origDom = $el.clone();
                // Assign each list item a unique number value
                $.each($origDom.children('li'), function (idx, val) {
                    $(val).attr("data-" + dataItemName, counter);
                    counter++;
                });

                this._counter = counter;

                $origDom.removeClass("ui-listview ui-shadow ui-corner-all ui-listview-inset ui-group-theme-" + this.options.theme)
                    .find("li")
                    .removeClass("ui-li-static ui-body-inherit ui-first-child ui-last-child")
                    .end()
                    .find("a")
                    .removeClass("ui-link")
                    .end();

                this._origDom = $origDom;
            }

            if (!this._created) {
                var wrapper = this._wrapCollapsible();
//                    ui = {};

                ui = {
                    wrapper: wrapper,
                    header: wrapper.find('h1'),
                    button: wrapper.find('h1 + a, h1 + button'),
                    content: wrapper.find('div.ui-collapsible-content'),
                };

                if (this.options.editableType === 'complex') {
                    ui.form = wrapper.closest(':jqmData(role="page")').find('#' + this.options.editableForm).detach();
                    var inputs = ui.content.find('li:first-child').find('[data-item-name]');

                    var itemNames = this._itemNames;
                    $.each(inputs, function (idx, val) {
                        itemNames.push($(val).data("item-name"));
                    });
                }

                $.extend(this, {
                    _ui: ui
                });

                ui.header.addClass('ui-btn-icon-left');

                evt = this._evt = $._data(ui.header.parent()[0], "events");
                this._clickHandler = evt.click[0].handler;

                this._attachEditEventButtons();

                this._created = true;
            }

            if (this._editMode) {
                ui = this._ui;
                $orig = $origDom.clone();
                $origLis = $orig.find('li');

                if ($orig.find('a').length === 0) {
                    $origLis.wrapInner('<a></a>').append('<a class="ui-editable-btn-del">Delete</a>');
                } else {
                    $origLis.append('<a class="ui-editable-btn-del">Delete</a>');
                }

                this.option("splitIcon", "minus");

                if (opts.editableType === 'complex') {
                    $orig.prepend($('<li>' + ui.form[0].innerHTML + '</li>'));
                }
                if (opts.editableType === 'simple') {
                    $orig.prepend($markup.listTextInput);
                }

                $lis.remove();
                $el.append($orig.find('li'));

                evt.click[0].handler = $.noop; // disabling header click event
            } else {
                evt.click[0].handler = this._clickHandler;  // enabling header click event
                $lis.remove().end().append($origDom.clone().find('li'));
            }

            this._updateHeader();
        },

        _afterListviewRefresh: function () {
            this._attachDetachEventHandlers();
        },

        _wrapCollapsible: function () {
            var $el = this.element,
                opts = this.options,
                isListEmpty = this._isListEmpty();

            if (opts.editable) {
                $el.wrap('<div data-role="collapsible"></div>');
                $el.parent().prepend('<div data-role="header">' +
                    '<h1>List Items</h1>' +
                    '<button class="ui-btn-right ui-btn ui-btn-b ui-btn-inline ui-mini ui-corner-all ui-btn-icon-right ui-icon-edit">Edit</button>' +
                    '</div>');
            }

            $el.parents($.mobile['collapsible'].initSelector)
                .not($.mobile.page.prototype.keepNativeSelector())['collapsible']({
                    expandedIcon: this.options.expandedIcon,
                    collapsedIcon: this.options.collapsedIcon
                });

            return $el.parent().parent();
        },

        _attachEditEventButtons: function () {
            if (this._isListEmpty()) {
                this._ui.header.off("click");
            }

            this._on(this.element.parent().parent().find('.ui-collapsible-heading a, .ui-collapsible-heading button'), {
                "click": "_onEditButtonTapped"
            });
        },

        // --(start)-- Event Handlers --

        _onEditButtonTapped: function (e) {
            var editMode = this._editMode = !this._editMode,
                $collapsible = this.element.parents(":jqmData(role='collapsible')");

            editMode ? $collapsible.collapsible("expand") : $collapsible.collapsible("collapse");

            this.refresh();

            e.preventDefault();
            e.stopPropagation();

            if (!editMode) {
                this._triggerListChange(e);
            }
        },

        _updateHeader: function () {
            var ui = this._ui,
                opts = this.options,
                isListEmpty = this._isListEmpty();

            // Update List Header Title
            ui.header.text(isListEmpty ? opts.listEmptyTitle : opts.listTitle);

            // Change "Edit" button state, icon and label
            ui.button.removeClass('ui-icon-minus ui-icon-' + opts.doneIcon + ' ui-icon-' + opts.addIcon + ' ui-icon-' + opts.editIcon)
                .addClass('ui-icon-' + (this._editMode ? opts.doneIcon : isListEmpty ? opts.addIcon : opts.editIcon))
                .text(this._editMode ? opts.doneLabel : isListEmpty ? opts.addLabel : opts.editLabel);

        },

        // _triggerListChange
        _triggerListChange: function (e) {
            var items = this.items(),
                length = this.length();
            this._trigger('change', e, {
                items: items,
                length: length,
            });
        },

        // --(end)-- Event Handlers --

        // --(start)-- Event Handler Helper Functions --

        _attachDetachEventHandlers: function () {
            this._enableInsertListItemEvent();
            this._enableListItemDeleteEvent();

            //            this._enableListItemEditing() // v0.2
        },


        _enableInsertListItemEvent: function () {
            var $addBtn, $clearBtn, $textField,
                opts = this.options,
                editableType = opts.editableType,
                $content = this._ui.content;

            if (this._editMode) {
                $addBtn = (editableType === 'simple') ? $content.find('li.ui-editable-temp a#item-add') : $content.find("li:first-child [data-add-button='true']"),
                $clearBtn = (editableType === 'complex') ? $content.find("li:first-child [data-clear-button='true']") : null,
                $textField = (editableType === 'simple') ? $content.find('input[type=text]') : null;

                this._on($addBtn, {
                    "tap": "_insertListItem"
                });

                if ($clearBtn !== null) {
                    this._on($clearBtn, {
                        "tap": "_clearTextFields"
                    });
                }

                if ($textField !== null) {
                    this._on($textField, {
                        "keyup": "_insertListItem"
                    });
                }
            }
        },

        _clearTextFields: function (e) {
            var inputs = $(e.target).parents('li').find('[data-item-name]');

            $.each(inputs, function (idx, val) {
                $(val).val("");
            });
        },

        _enableListItemDeleteEvent: function () {
            this._editMode ? this._on(this._ui.content.find('a.ui-editable-btn-del'), {
                "click": "_deleteListItem"
            }) : this._off(this._ui.content.find('a.ui-editable-btn-del'), "click");
        },


        // TODO v0.2
        /*_enableListItemEditing: function() {},*/

        _insertListItem: function (e) {
            e.preventDefault();

            // returning immediately if keyup keycode does not match keyCode.ENTER i.e. 13
            if (e.type !== "tap" && e.keyCode !== $.mobile.keyCode.ENTER) return;

            if (this.options.editableType === 'complex') {
                var liTemplate = '',
                    proceed = true,
                    inputs = $(e.target).parents('li').find('[data-item-name]');


                $.each(inputs, function (idx, val) {
                    var $input = $(val),
                        elem = $input.data("item-element"),
                        value = $input.val();

                    if (!value) {
                        proceed = false;
                    }

                    liTemplate += "<" + elem + ">" + value + "</" + elem + ">";
                });

                // Not proceeding to add if any input value is empty
                if (!proceed) return;

                liTemplate = $("<li><a>" + liTemplate + "</a></li>");

                liTemplate.attr("data-" + this._dataItemName, this._counter);
                this._counter++;

                this._origDom.prepend(liTemplate);
                this.refresh();

            }

            if (this.options.editableType === 'simple') {

                var $target = $(e.target),
                    $input = (e.type === "keyup") ? $target : $target.prev().find('input'),
                    inputTextString = $input.val();

                // Inserting list item only if input string is not empty
                if (!!inputTextString) {
                    $input.val(""); // Clearing the input text field

                    var liTemplate = this._isListEmpty() ? $('<li></li>') // simple static list template is list is empty
                        : this._origDom.find('li').first().clone(); //

                    liTemplate.attr("data-" + this._dataItemName, this._counter);
                    this._counter++;

                    if (liTemplate.children().length === 0) {
                        liTemplate.text(inputTextString);
                    } else {
                        liTemplate.children('a').text(inputTextString);
                    }

                    this._origDom.prepend(liTemplate);
                    this.refresh();
                }
            }
        },

        _deleteListItem: function (e) {
            var $parentTarget = $(e.currentTarget).parent(),
                itemNum = $parentTarget.data(this._dataItemName);

            this._origDom.find("li[data-" + this._dataItemName + "=\"" + itemNum + "\"]")
                .remove();

            $parentTarget.remove();
            this._updateHeader();
            e.preventDefault();
            e.stopPropagation();
        },

        // --(end)-- Event Handler Helper Functions --

        /*
        _destroy: function() {
            var ui = this._ui,
                opts = this.options,
                $ul = ui.content.filter('ul'),
                $li = $ul.find('li'),
                items = this.items()

            // Not doing anything if DOM was already enhanced
            if ( opts.enhanced ) {
                return this;
            }

            ui.header.remove()
            ui.content = ui.content.unwrap().unwrap()

            $ul.removeClass("ui-listview ui-corner-all ui-shadow ui-collapsible-collapsed")
            $ul.find('a').remove()
            this._removeFirstLastClasses($li)
            $li.removeClass('ui-li-has-alt')
            $li.each( function(idx, val) {
                this.textContent = items[idx]
            })

            return ui
        },*/

        _isListEmpty: function () {
            return (this.element.find('li').not('li.ui-editable-temp').length === 0) ? true : false;
        },

        _$markup: {

            listTextInput: "<li class='ui-editable-temp ui-btn' style='padding: 0.3em 0.8em;'>" +
                "<div class='ui-editable-flex'>" +
                "<div style='background-color: white; padding: 0;' class='ui-editable-flex-item-left ui-editable-border-left ui-input-text ui-btn ui-shadow-inset'>" +
                "<input type='text'>" +
                "</div>" +
                "<a id='item-add' style='height: auto' class='ui-editable-flex-item-right ui-editable-border-right ui-btn ui-shadow ui-btn-icon-notext ui-icon-plus'>Add</a>" +
                "</div>" +
                "</li>"
        },

        // Public API

        length: function () {
            return this.element.find('li').length;
        },

        items: function () {
            var arr = [];

            if (this.options.editableType === 'simple') {
                this.element.find('li').each(function (idx, el) {
                    arr.push(el.textContent);
                });
            }

            if (this.options.editableType === 'complex') {
                this.element.find('a').each(function (idx, el) {
                    var obj = {};
                    $(el).children().each(function (idx, val) {
                        obj[this._itemNames[idx]] = $(val).text();
                    });
                    arr.push(obj);
                });
            }

            return arr;
        },

        widget: function () {
            return this._ui.wrapper;
        }

    });

}(jQuery));


/* -- Patching collapsible -- */
(function ($, undefined) {
    "use strict";

    $.widget("mobile.collapsible", $.mobile.collapsible, {

        options: {
            heading: "h1,h2,h3,h4,h5,h6,legend,:jqmData(role='header')",
        },

        _create: function () {
            var elem = this.element,
                ui = {
                    accordion: elem
                    .closest(":jqmData(role='collapsible-set')," +
                             ":jqmData(role='collapsibleset')" +
                             ($.mobile.collapsibleset ? ", :mobile-collapsibleset" :
                              ""))
                    .addClass("ui-collapsible-set")
                };

            this._ui = ui;
            this._renderedOptions = this._getOptions(this.options);

            $.each(this._childWidgets, $.proxy(function (number, widgetName) {
                if ($.mobile[widgetName]) {
                    this.element.find($.mobile[widgetName].initSelector).not($.mobile.page.prototype.keepNativeSelector())[widgetName]();
                }
            }, this));

            if (this.options.enhanced) {
                ui.heading = $(".ui-collapsible-heading", this.element[0]);
                ui.content = ui.heading.next();
                ui.anchor = $("a", ui.heading[0]).first();
                ui.status = ui.anchor.children(".ui-collapsible-heading-status");
            } else {
                this._enhance(elem, ui);
            }

            this._on(ui.heading, {
                "tap": function () {
                    ui.heading.find("a").first().addClass($.mobile.activeBtnClass);
                },

                "click": function (event) {
                    var $target = $(event.target);
                    if ($target.hasClass("ui-collapsible-heading") || $target.hasClass("ui-collapsible-heading-toggle")) {
                        this._handleExpandCollapse(!ui.heading.hasClass("ui-collapsible-heading-collapsed"));
                    }
                    event.preventDefault();
                    event.stopPropagation();
                }
            });
        },

        _childWidgets: ["toolbar"],

        _enhance: function (elem, ui) {
            var iconclass,
                opts = this._renderedOptions,
                contentThemeClass = this._themeClassFromOption("ui-body-", opts.contentTheme);

            elem.addClass("ui-collapsible " +
                          (opts.inset ? "ui-collapsible-inset " : "") +
                          (opts.inset && opts.corners ? "ui-corner-all " : "") +
                          (contentThemeClass ? "ui-collapsible-themed-content " : ""));
            ui.originalHeading = elem.children(this.options.heading).first(),
                ui.content = elem
            .wrapInner("<div " +
                       "class='ui-collapsible-content " +
                       contentThemeClass + "'></div>")
            .children(".ui-collapsible-content"),
                ui.heading = ui.originalHeading;

            // Replace collapsibleHeading if it's a legend
            if (ui.heading.is("legend")) {
                ui.heading = $("<div role='heading'>" + ui.heading.html() + "</div>");
                ui.placeholder = $("<div><!-- placeholder for legend --></div>").insertBefore(ui.originalHeading);
                ui.originalHeading.remove();
            }

            iconclass = (opts.collapsed ? (opts.collapsedIcon ? "ui-icon-" + opts.collapsedIcon : "") :
                         (opts.expandedIcon ? "ui-icon-" + opts.expandedIcon : ""));

            ui.status = $("<span class='ui-collapsible-heading-status'></span>");
            ui.anchor = ui.heading
            .detach()
            //modify markup & attributes
            .addClass("ui-collapsible-heading")
            .append(ui.status)
            .wrapInner(ui.heading.is(":jqmData(role='header')") ? "" : "<a href='#'></a>")
            .find(ui.heading.is(":jqmData(role='header')") ? "h1,h2,h3,h4,h5,h6" : "a")
            .first()
            .addClass("ui-collapsible-heading-toggle" +
                      (ui.heading.is(":jqmData(role='header')") ? "" : " ui-btn " +
                       (iconclass ? iconclass + " " : "") +
                       (iconclass ? iconposClass(opts.iconpos) + " " : "") +
                       this._themeClassFromOption("ui-btn-", opts.theme) + " " +
                       (opts.mini ? "ui-mini " : "")));

            //drop heading in before content
            ui.heading.insertBefore(ui.content);

            this._handleExpandCollapse(this.options.collapsed);

            return ui;
        },

        _handleExpandCollapse: function (isCollapse) {
            var opts = this._renderedOptions,
                ui = this._ui;

            ui.status.text(isCollapse ? opts.expandCueText : opts.collapseCueText);
            ui.heading
            .toggleClass("ui-collapsible-heading-collapsed", isCollapse)
            .find(".ui-collapsible-heading-toggle")
            .toggleClass("ui-icon-" + opts.expandedIcon, !isCollapse)

            // logic or cause same icon for expanded/collapsed state would remove the ui-icon-class
            .toggleClass("ui-icon-" + opts.collapsedIcon, (isCollapse || opts.expandedIcon === opts.collapsedIcon))
            .removeClass($.mobile.activeBtnClass);

            this.element.toggleClass("ui-collapsible-collapsed", isCollapse);
            ui.content
            .toggleClass("ui-collapsible-content-collapsed", isCollapse)
            .attr("aria-hidden", isCollapse)
            .trigger("updatelayout");
            this.options.collapsed = isCollapse;
            this._trigger(isCollapse ? "collapse" : "expand");
        },

    });

})(jQuery);
/* --- End of Patch --- */

