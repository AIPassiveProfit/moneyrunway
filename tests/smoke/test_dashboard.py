"""Level 1 — smoke tests against a deployed Money Runway.

Three questions and nothing more: does it load, does it error, is the important
thing on the screen? Run these after every deploy. If they fail, the site is
broken for a real person right now.
"""

import re

from playwright.sync_api import Page, expect

MONEY = re.compile(r"^−?\$[\d,]+$")


def _collect_errors(page: Page) -> list[str]:
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on(
        "console",
        lambda msg: errors.append(f"console: {msg.text}") if msg.type == "error" else None,
    )
    return errors


def test_dashboard_loads_without_errors(page: Page, base_url: str) -> None:
    errors = _collect_errors(page)

    response = page.goto(base_url, wait_until="networkidle")
    assert response is not None and response.status == 200, "the site did not return 200"

    expect(page.get_by_test_id("safe-to-spend-amount")).to_be_visible()
    expect(page.get_by_test_id("money-runway-card")).to_be_visible()
    expect(page.get_by_test_id("next-best-action")).to_be_visible()
    expect(page.get_by_test_id("upcoming-money")).to_be_visible()

    assert errors == [], "JavaScript errors on load:\n" + "\n".join(errors)


def test_hero_number_is_a_real_dollar_amount(page: Page, base_url: str) -> None:
    page.goto(base_url, wait_until="networkidle")
    amount = page.get_by_test_id("safe-to-spend-amount").inner_text().strip()
    assert MONEY.match(amount), f"Safe to Spend showed {amount!r}, which is not a dollar amount"


def test_status_is_one_of_the_three_states(page: Page, base_url: str) -> None:
    page.goto(base_url, wait_until="networkidle")
    status = page.get_by_test_id("safe-to-spend-status").inner_text().strip().lower()
    assert status in {"on track", "tight but manageable", "short before payday"}, status


def test_no_sideways_scrolling_on_a_small_phone(page: Page, base_url: str) -> None:
    page.set_viewport_size({"width": 320, "height": 700})
    page.goto(base_url, wait_until="networkidle")

    overflows = page.evaluate(
        "() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"
    )
    assert overflows is False, "the page scrolls sideways on a 320px screen"


def test_the_disclaimer_is_visible(page: Page, base_url: str) -> None:
    page.goto(base_url, wait_until="networkidle")
    expect(
        page.get_by_text("not financial, investment, tax, legal, or credit advice", exact=False)
    ).to_be_visible()


def test_the_explainer_opens(page: Page, base_url: str) -> None:
    page.goto(base_url, wait_until="networkidle")
    page.get_by_test_id("explain-button").click()
    expect(page.get_by_role("dialog", name="How is this calculated?")).to_be_visible()
