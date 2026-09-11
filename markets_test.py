"""Parse/merge tests for magasin market snapshot. No invented numbers."""
from __future__ import annotations

import unittest

import markets


class RatingTests(unittest.TestCase):
    def test_strong_buckets_only(self):
        self.assertEqual(markets.rating_from_recommend(0.5), "Strong Buy")
        self.assertEqual(markets.rating_from_recommend(0.601), "Strong Buy")
        self.assertEqual(markets.rating_from_recommend(-0.5), "Strong Sell")
        self.assertEqual(markets.rating_from_recommend(-0.91), "Strong Sell")
        self.assertIsNone(markets.rating_from_recommend(0.464))
        self.assertIsNone(markets.rating_from_recommend(-0.484))
        self.assertIsNone(markets.rating_from_recommend("0.9"))
        self.assertIsNone(markets.rating_from_recommend(None))
        self.assertIsNone(markets.rating_from_recommend(True))

    def test_display_pair(self):
        self.assertEqual(markets.display_pair("EURUSD"), "EUR/USD")
        self.assertEqual(markets.display_pair("eurusd"), "EUR/USD")
        self.assertEqual(markets.display_pair(""), "")


class YahooParseTests(unittest.TestCase):
    def test_price_and_change(self):
        payload = {
            "chart": {
                "result": [
                    {
                        "meta": {
                            "symbol": "NVDA",
                            "regularMarketPrice": 223.67,
                            "chartPreviousClose": 217.44,
                        }
                    }
                ]
            }
        }
        parsed = markets.parse_yahoo_chart(payload)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["price"], 223.67)
        self.assertAlmostEqual(parsed["change_pct"], (223.67 - 217.44) / 217.44 * 100)

    def test_missing_price_is_none(self):
        self.assertIsNone(markets.parse_yahoo_chart({"chart": {"result": [{"meta": {}}]}}))
        self.assertIsNone(markets.parse_yahoo_chart({}))
        self.assertIsNone(markets.parse_yahoo_chart(None))

    def test_price_without_prev_keeps_pct_empty(self):
        parsed = markets.parse_yahoo_chart(
            {"chart": {"result": [{"meta": {"regularMarketPrice": 10}}]}}
        )
        self.assertEqual(parsed["price"], 10.0)
        self.assertIsNone(parsed["change_pct"])


class CmcParseTests(unittest.TestCase):
    def test_spotlight_gainers(self):
        payload = {
            "data": {
                "gainerList": [
                    {
                        "name": "Kaspa",
                        "symbol": "KAS",
                        "priceChange": {"priceChange24h": 7.93},
                    },
                    {"name": "Skip", "symbol": "X", "priceChange": {}},
                ]
            }
        }
        items = markets.parse_cmc_spotlight(payload)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["symbol"], "KAS")
        self.assertEqual(items[0]["change_pct"], 7.93)

    def test_spotlight_garbage_is_none(self):
        self.assertIsNone(markets.parse_cmc_spotlight({"data": []}))
        self.assertIsNone(markets.parse_cmc_spotlight(None))

    def test_listings_quote_list_or_dict(self):
        listed = {
            "data": [
                {
                    "symbol": "AAA",
                    "name": "Aaa",
                    "quote": {"USD": {"percent_change_24h": 3.2}},
                },
                {
                    "symbol": "BBB",
                    "name": "Bbb",
                    "quote": [{"symbol": "USD", "percent_change_24h": 9.1}],
                },
                {"symbol": "CCC", "quote": {"USD": {}}},
            ]
        }
        items = markets.parse_cmc_listings(listed)
        self.assertEqual([i["symbol"] for i in items], ["BBB", "AAA"])


class InvestingAndTvTests(unittest.TestCase):
    def test_investing_daily_strong_buy(self):
        payload = {
            "data": [
                {
                    "screen_data": {
                        "technical_data": [
                            {
                                "timeframe": "86400",
                                "main_summary": {"text": "Strong Buy"},
                            }
                        ]
                    }
                }
            ]
        }
        hit = markets.parse_investing_screen(payload, "EUR/USD")
        self.assertEqual(hit, {"pair": "EUR/USD", "rating": "Strong Buy"})

    def test_investing_neutral_not_surfaced(self):
        payload = {
            "data": [
                {
                    "screen_data": {
                        "technical_data": [
                            {"timeframe": "86400", "main_summary": {"text": "Neutral"}}
                        ]
                    }
                }
            ]
        }
        self.assertIsNone(markets.parse_investing_screen(payload, "EUR/USD"))

    def test_tradingview_splits_strong_only(self):
        payload = {
            "data": [
                {"d": ["EURCHF", "Euro / Swiss", 0.94, 0.01, 0.601]},
                {"d": ["EURUSD", "Euro / US", 1.16, 0.05, 0.464]},
                {"d": ["USDJPY", "US / Yen", 153.3, -0.1, -0.55]},
            ]
        }
        buy, sell = markets.parse_tradingview_forex(payload)
        self.assertEqual(buy, [{"pair": "EUR/CHF", "rating": "Strong Buy"}])
        self.assertEqual(sell, [{"pair": "USD/JPY", "rating": "Strong Sell"}])

    def test_tradingview_bad_payload(self):
        self.assertIsNone(markets.parse_tradingview_forex(None))
        self.assertIsNone(markets.parse_tradingview_forex({"data": "nope"}))


class MergeTests(unittest.TestCase):
    def test_failed_refresh_keeps_last_price_as_stale(self):
        prev = markets.empty_snapshot()
        prev["quotes"][0] = {
            "id": "gold",
            "symbol": "Gold",
            "price": 4455.2,
            "change_pct": 0.57,
            "status": "ok",
        }
        prev["updated_at"] = "2026-09-10T07:00:00Z"
        failed_quotes = [markets.empty_quote(spec) for spec in markets.QUOTE_SPECS]
        snap = markets.build_snapshot(markets.empty_fx(), failed_quotes, markets.empty_gainers(), prev)
        gold = next(q for q in snap["quotes"] if q["id"] == "gold")
        self.assertEqual(gold["price"], 4455.2)
        self.assertEqual(gold["status"], "stale")
        self.assertEqual(snap["updated_at"], "2026-09-10T07:00:00Z")
        self.assertTrue(snap["stale"])

    def test_never_invents_when_nothing_fetched(self):
        snap = markets.build_snapshot(
            markets.empty_fx(),
            [markets.empty_quote(spec) for spec in markets.QUOTE_SPECS],
            markets.empty_gainers(),
            None,
        )
        self.assertEqual(snap["updated_at"], "")
        self.assertTrue(snap["stale"])
        for q in snap["quotes"]:
            self.assertIsNone(q["price"])
            self.assertEqual(q["status"], "saknas")
        self.assertEqual(snap["fx"]["strong_buy"], [])
        self.assertEqual(snap["gainers"]["items"], [])


if __name__ == "__main__":
    unittest.main()
