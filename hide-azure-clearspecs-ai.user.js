// ==UserScript==
// @name         Azure DevOps: Hide ClearSpecs AI panel
// @namespace    https://marcinorlowski.com/
// @version      1.0.0
// @description  Removes the "ClearSpecs AI" section from Azure DevOps work item forms and widens the description column to reclaim the freed space.
// @github       http://github.com/MarcinOrlowski/hide-azure-clearspecs-ai/
// @author       Marcin Orlowski <mail@marcinorlowski.com>
// @match        https://dev.azure.com/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

// The script applies two independent fixes:
//
// 1. **Hide the section.** Walk every `.work-item-form-collapsible-header` and,
//    when the heading text matches `HEADING_TEXT`, mark the enclosing
//    `.work-item-form-section` with `data-tm-clearspecs-hidden`. A stylesheet
//    hides any element carrying that attribute via
//    `display: none !important`. A `MutationObserver` re-runs the match when
//    Azure's SPA router re-renders the form.
// 2. **Reclaim the space.** A media-query-scoped CSS override (≥600px)
//    rewrites `.work-item-grid` to `grid-template-columns: minmax(60%, 70%) 1fr`
//    and pins `.work-item-form-right` to `grid-area: 1 / 2 / 3 / 3` with
//    `grid-template-columns: 1fr`. The `:not(.section-count-1):not(.section-count-2)`
//    guard leaves simpler single/double-section layouts alone. Below 600px
//    Azure's native single-column mobile layout takes over untouched, as that
//    view does not contain ClearSpecs AI section.

(function () {
    'use strict';

    // Attribute used to mark hidden nodes.
    const HIDDEN_ATTR = 'data-tm-clearspecs-hidden';

    // Section heading to match. Change if your UI language renames it.
    const HEADING_TEXT = 'ClearSpecs AI';

    // The form uses a CSS grid (.work-item-grid). Azure sets it to 3 columns
    // whenever .first-column-wide is applied (via a rule with no media query,
    // winning on specificity), and points .work-item-form-right at columns
    // that extend beyond the grid — leaving an empty trailing column as a
    // visible gap. We collapse the grid to 2 columns and pin the right-area
    // to column 2 across all multi-column viewport widths (≥600px).
    // Section-count-1/2 layouts are simpler stacks, so leave them alone.
    const css = `
        [${HIDDEN_ATTR}] { display: none !important; }

        @media screen and (min-width: 600px) {
            .work-item-grid:not(.section-count-1):not(.section-count-2) {
                grid-template-columns: minmax(60%, 70%) 1fr !important;
            }
            .work-item-grid:not(.section-count-1):not(.section-count-2) .work-item-form-right {
                grid-area: 1 / 2 / 3 / 3 !important;
                grid-template-columns: 1fr !important;
            }
        }
    `;
    if (typeof GM_addStyle === 'function') {
        GM_addStyle(css);
    } else {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    function hideIn(root) {
        if (!root || root.nodeType !== 1) return;

        const headings = root.querySelectorAll(
            '.work-item-form-collapsible-header span[role="heading"]'
        );
        for (const h of headings) {
            if (h.textContent.trim() !== HEADING_TEXT) continue;
            const section = h.closest('.work-item-form-section');
            if (section && !section.hasAttribute(HIDDEN_ATTR)) {
                section.setAttribute(HIDDEN_ATTR, '');
            }
        }

        // If the root itself is a matching heading (e.g. observer gave us a deep node)
        if (root.matches &&
            root.matches('.work-item-form-collapsible-header span[role="heading"]') &&
            root.textContent.trim() === HEADING_TEXT) {
            const section = root.closest('.work-item-form-section');
            if (section && !section.hasAttribute(HIDDEN_ATTR)) {
                section.setAttribute(HIDDEN_ATTR, '');
            }
        }
    }

    function start() {
        hideIn(document.body);
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    hideIn(node);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.body) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    }
})();