/**
 * ========================================================================
 * DYNAMIC MULTIPLICATION TABLE GENERATOR  —  script.js
 * ========================================================================
 * Author      : Luca Azevedo
 * Contact     : lucaazevedo@student.uml.edu
 * Course      : COMP.4610 GUI Programming I
 * Institution : University of Massachusetts Lowell
 *
 * OVERVIEW
 * --------
 * This file wires up the entire UI. Everything lives inside a single
 * $(document).ready() callback so the code only runs once the DOM exists.
 *
 * Responsibilities, in order:
 *   1. Activate the jQuery UI Tabs widget.
 *   2. Build four sliders and two-way-bind each to its number input.
 *   3. Configure jQuery Validation rules/messages for the four inputs.
 *   4. Handle the "Generate" click: validate, then spawn a new table tab.
 *   5. Generate the actual <table> DOM for a given range.
 *   6. Handle closing a single tab and deleting all generated tabs.
 *
 * DEPENDENCIES: jQuery, jQuery UI, jQuery Validation (all loaded in <head>).
 * ========================================================================
 */

// $(document).ready(callback) runs the callback once the DOM is fully parsed.
$(document).ready(() => {

    // Monotonic counter used to mint a unique id for every generated tab
    // (generated-tab-1, generated-tab-2, ...). It only ever increments, so
    // ids are never reused even after tabs are deleted.
    let tabCounter = 1;

    // Turn the #tabs container into a working jQuery UI Tabs widget. After
    // this call, clicking a tab button shows its panel automatically.
    $("#tabs").tabs();

    /**
     * Two-way bind a number <input> and a jQuery UI slider so editing
     * either one keeps the other in sync.
     *
     * @param {string} inputId  jQuery selector for the <input> (e.g. "#min-multiplier")
     * @param {string} sliderId jQuery selector for the slider <div>
     */
    function setupTwoWayBinding(inputId, sliderId) {
        // Build the slider. Its starting value is read from the input;
        // if the input is blank/non-numeric we fall back to 0.
        $(sliderId).slider({
            min: -50,
            max: 50,
            value: parseInt($(inputId).val(), 10) || 0,
            // Fires continuously as the user drags the handle. ui.value is
            // the new slider value; push it into the text input.
            slide: function (event, ui) {
                $(inputId).val(ui.value);
            }
        });

        // The reverse direction: when the user types in the input, move the
        // slider to match — but only if the typed value is a valid number
        // inside the allowed range, otherwise leave the slider alone.
        $(inputId).on("keyup change", function () {
            let val = parseInt($(this).val(), 10);
            if (!isNaN(val) && val >= -50 && val <= 50) {
                $(sliderId).slider("value", val);
            }
        });
    }

    // Create all four input/slider pairs.
    setupTwoWayBinding("#min-multiplier",   "#slider-min-multiplier");
    setupTwoWayBinding("#max-multiplier",   "#slider-max-multiplier");
    setupTwoWayBinding("#min-multiplicand", "#slider-min-multiplicand");
    setupTwoWayBinding("#max-multiplicand", "#slider-max-multiplicand");

    /**
     * Configure jQuery Validation on the form. This sets up the rules and
     * the per-field error messages, and tells the plugin how to render an
     * error label. We keep a reference to the returned validator object so
     * we can drive it manually (showErrors / resetForm) from the click
     * handler below.
     *
     * The object keys ("min-multiplier", ...) are the inputs' NAME
     * attributes, not their ids — that is how jQuery Validation maps rules
     * to fields.
     */
    const validator = $("#table-form").validate({
        rules: {
            "min-multiplier":   { required: true, number: true, range: [-50, 50] },
            "max-multiplier":   { required: true, number: true, range: [-50, 50] },
            "min-multiplicand": { required: true, number: true, range: [-50, 50] },
            "max-multiplicand": { required: true, number: true, range: [-50, 50] }
        },
        messages: {
            "min-multiplier":   { required: "Required.", number: "Invalid.", range: "Bounds: -50 to 50." },
            "max-multiplier":   { required: "Required.", number: "Invalid.", range: "Bounds: -50 to 50." },
            "min-multiplicand": { required: "Required.", number: "Invalid.", range: "Bounds: -50 to 50." },
            "max-multiplicand": { required: "Required.", number: "Invalid.", range: "Bounds: -50 to 50." }
        },
        // Called by the plugin whenever it needs to place an error message.
        // We tag it with our CSS class and insert it right after the input.
        errorPlacement: function (error, element) {
            error.addClass("jquery-validation-error");
            error.insertAfter(element);
        }
    });

    /**
     * "Generate Table Tab" click handler.
     *
     * Instead of relying on validator.form() (which can silently fail to
     * surface errors in some setups), we read and validate the four values
     * ourselves, including a cross-field check that start <= end, and then
     * drive the validator manually to display any problems.
     */
    $("#submit-btn").on("click", function () {
        // Read all four fields as integers.
        const minMultiplier   = parseInt($("#min-multiplier").val(), 10);
        const maxMultiplier   = parseInt($("#max-multiplier").val(), 10);
        const minMultiplicand = parseInt($("#min-multiplicand").val(), 10);
        const maxMultiplicand = parseInt($("#max-multiplicand").val(), 10);

        // Pair each value with the field name the validator expects.
        const fields = [
            { val: minMultiplier,   id: "min-multiplier" },
            { val: maxMultiplier,   id: "max-multiplier" },
            { val: minMultiplicand, id: "min-multiplicand" },
            { val: maxMultiplicand, id: "max-multiplicand" }
        ];

        // Collect errors keyed by field name. jQuery Validation's
        // showErrors() consumes exactly this { fieldName: message } shape.
        let customErrors = {};
        fields.forEach(function(f) {
            if (isNaN(f.val))                   customErrors[f.id] = "Invalid number.";
            else if (f.val < -50 || f.val > 50) customErrors[f.id] = "Bounds: -50 to 50.";
        });

        // Cross-field rule: a range's start must not exceed its end. Only
        // check this when both endpoints individually passed, so we don't
        // stack a confusing second error on an already-bad field.
        if (!customErrors["min-multiplier"] && !customErrors["max-multiplier"] && minMultiplier > maxMultiplier) {
            customErrors["min-multiplier"] = "Start value cannot exceed End value.";
        }
        if (!customErrors["min-multiplicand"] && !customErrors["max-multiplicand"] && minMultiplicand > maxMultiplicand) {
            customErrors["min-multiplicand"] = "Start value cannot exceed End value.";
        }

        // If anything failed, render the messages and stop — no table.
        if (Object.keys(customErrors).length > 0) {
            validator.showErrors(customErrors);
            return;
        }

        // All good: clear any leftover error labels, then build the tab.
        validator.resetForm();
        spawnNewTableTab(minMultiplier, maxMultiplier, minMultiplicand, maxMultiplicand);
    });

    /**
     * Create a brand-new jQuery UI tab containing a freshly built table.
     *
     * @param {number} minMult  multiplier start (left-most column header)
     * @param {number} maxMult  multiplier end   (right-most column header)
     * @param {number} minCand  multiplicand start (top row header)
     * @param {number} maxCand  multiplicand end   (bottom row header)
     */
    function spawnNewTableTab(minMult, maxMult, minCand, maxCand) {
        // Unique panel id and a human-readable tab label, e.g.
        // "M:[1,5] × C:[5,8]" (\u00D7 is the × multiplication sign).
        const tabId = "generated-tab-" + tabCounter;
        const tabTitle = "M:[" + minMult + "," + maxMult + "] \u00D7 C:[" + minCand + "," + maxCand + "]";

        // 1. The tab BUTTON: an <li> whose <a href> points at the panel id,
        //    plus a small × icon used to close this individual tab.
        const tabHeader = $(
            '<li class="closable-tab-item">' +
            '<a href="#' + tabId + '">' + tabTitle + '</a>' +
            '<span class="ui-icon ui-icon-close tab-close-x" style="display:inline-block;cursor:pointer;" title="Remove Tab"></span>' +
            '</li>'
        );

        // 2. The tab PANEL: a <div> whose id matches the href above,
        //    holding a scrollable wrapper and the empty target <table>.
        const tabContent = $(
            '<div id="' + tabId + '">' +
            '<div class="table-wrapper">' +
            '<table class="dynamic-generated-matrix"></table>' +
            '</div></div>'
        );

        // 3. Insert the button into the tab strip and the panel into #tabs.
        $("#tabs ul").append(tabHeader);
        $("#tabs").append(tabContent);

        // 4. Fill the (still empty) table element with rows/columns.
        //    .find(...)[0] unwraps the jQuery object to the raw DOM node,
        //    which is what generateMultiplicationTable expects.
        const targetTableElement = tabContent.find(".dynamic-generated-matrix")[0];
        generateMultiplicationTable(minMult, maxMult, minCand, maxCand, targetTableElement);

        // 5. tabs("refresh") tells jQuery UI to notice the DOM we just added;
        //    active = -1 then jumps focus to the last (newest) tab.
        $("#tabs").tabs("refresh");
        $("#tabs").tabs("option", "active", -1);

        // Advance the counter so the next tab gets a fresh id.
        tabCounter++;
    }

    /**
     * Build the multiplication table DOM directly with the native DOM API
     * (faster and safer than string concatenation since values are set via
     * textContent, never innerHTML).
     *
     * Layout: top row = column headers (multipliers startCol..endCol),
     * left column = row headers (multiplicands startRow..endRow), and each
     * body cell = row * col.
     *
     * @param {number} startCol  first column header value
     * @param {number} endCol    last  column header value
     * @param {number} startRow  first row header value
     * @param {number} endRow    last  row header value
     * @param {HTMLTableElement} targetTable  the <table> node to fill
     */
    function generateMultiplicationTable(startCol, endCol, startRow, endRow, targetTable) {
        // Clear anything previously inside the table.
        targetTable.innerHTML = "";

        // ---- Header row ----
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        // Top-left corner cell (blank): sits above the row headers.
        const originTh = document.createElement("th");
        originTh.className = "origin-cell";
        headerRow.appendChild(originTh);

        // One <th> per column, labelled with the multiplier value.
        for (let col = startCol; col <= endCol; col++) {
            const th = document.createElement("th");
            th.className = "top-header";
            th.textContent = col;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        targetTable.appendChild(thead);

        // ---- Body rows ----
        const tbody = document.createElement("tbody");
        for (let row = startRow; row <= endRow; row++) {
            const tableRow = document.createElement("tr");

            // Left-most cell of the row: the multiplicand (row header).
            const leftHeaderTh = document.createElement("th");
            leftHeaderTh.className = "left-header";
            leftHeaderTh.textContent = row;
            tableRow.appendChild(leftHeaderTh);

            // Product cells across the row.
            for (let col = startCol; col <= endCol; col++) {
                const td = document.createElement("td");
                td.textContent = row * col;
                tableRow.appendChild(td);
            }
            tbody.appendChild(tableRow);
        }
        targetTable.appendChild(tbody);
    }

    /**
     * Close a SINGLE generated tab.
     *
     * Bound with event delegation on #tabs so it also works for the close
     * icons inside tabs that didn't exist when the page loaded. "this" is
     * the clicked × span.
     */
    $("#tabs").on("click", ".tab-close-x", function () {
        // Walk up to the <li> tab button, then read the panel id that
        // jQuery UI stores on it as aria-controls.
        const parentLi = $(this).closest("li");
        const panelId = parentLi.attr("aria-controls");

        // Remove both halves of the tab: the button and its panel.
        parentLi.remove();
        $("#" + panelId).remove();

        $("#tabs").tabs("refresh");
        // If only the permanent "Workspace Dashboard" tab is left, select it
        // so the widget isn't left pointing at a tab that no longer exists.
        if ($("#tabs ul li").length === 1) {
            $("#tabs").tabs("option", "active", 0);
        }
    });

    /**
     * Delete ALL generated tabs at once, leaving only the permanent
     * "Workspace Dashboard" tab. We target only .closable-tab-item <li>s so
     * the permanent tab is never removed.
     */
    $("#delete-all-tabs-btn").on("click", function () {
        $("#tabs ul li.closable-tab-item").each(function () {
            const panelId = $(this).attr("aria-controls");
            $("#" + panelId).remove(); // remove the panel
            $(this).remove();          // remove the tab button
        });

        $("#tabs").tabs("refresh");
        $("#tabs").tabs("option", "active", 0); // back to the dashboard tab
    });
});