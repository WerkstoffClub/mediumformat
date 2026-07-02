#!/usr/bin/env python3
"""Build PURCHASED-sheet TSV blocks from parsed invoice data.

Output columns (A→R), one block per invoice, tab-separated:
A Order Date | B Source | C No | D Artist Name | E Catalog Title | F Format |
G Edition | H Qty | I UPC/Catalog No. | J AEC Cat | K Total Items Ordered |
L Wt/PCS (LB) | M Wt/PCS (KG) | N Total Wt (KG) | O Shipping Cost |
P Forwarder Ship (IDR) | Q Vendor Ship (IDR) | R Item Price/PCS

Conventions:
- Shipping (col O) only on row 1 of each invoice; blank on rest.
- Total Items Ordered (col K) only on row 1; blank on rest.
- Forwarder/Vendor Ship (P,Q) left blank — user fills.
- Weight per piece looked up from format → standard table.
- Edition = variant/color/special-ed text only, blank if standard.
- Currency stays native (USD for P12/P19, EUR for P18).
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

LB_TO_KG = 0.453592

# Standard weight per piece (lb), by canonical format key
WEIGHT_LB = {
    'CD': 0.25,
    '2xCD': 0.45,
    'CD Single': 0.20,
    'LP': 0.50,
    'LP 180g': 0.55,
    '2xLP': 1.00,
    '2xLP 180g': 1.15,
    '12"': 0.45,
    '7"': 0.20,
    'Cassette': 0.15,
    '2xCassette': 0.25,
    'Headphones': 1.20,
    'CD+Blu-ray': 0.50,
}


@dataclass
class Item:
    no: int
    artist: str
    title: str
    fmt: str          # canonical format key (see WEIGHT_LB)
    edition: str      # variant text, "" if standard
    qty: int
    upc: str          # UPC or vendor cat no
    price: float      # per-piece price
    aec: str = ""     # AEC Product# (P12 / WebAMI only)


@dataclass
class Invoice:
    source: str
    order_date: str        # MM/DD/YYYY
    currency_symbol: str   # $ or €
    shipping: float        # total invoice shipping in invoice currency
    total_units: int       # sum of qty across rows
    items: list[Item] = field(default_factory=list)


def fmt_price(currency: str, value: float) -> str:
    return f"{currency}{value:,.2f}"


def fmt_money(value: float) -> str:
    return f"{value:,.2f}"


def build_block(inv: Invoice) -> list[list[str]]:
    rows = []
    for idx, it in enumerate(inv.items, start=1):
        wt_lb = WEIGHT_LB.get(it.fmt)
        if wt_lb is None:
            wt_lb_s = ""
            wt_kg_s = ""
            tot_kg_s = ""
        else:
            wt_kg = wt_lb * LB_TO_KG
            tot_kg = wt_kg * it.qty
            wt_lb_s = f"{wt_lb:.2f}"
            wt_kg_s = f"{wt_kg:.4f}"
            tot_kg_s = f"{tot_kg:.4f}"

        shipping_cell = fmt_price(inv.currency_symbol, inv.shipping) if idx == 1 else ""
        total_items_cell = str(inv.total_units) if idx == 1 else ""

        row = [
            inv.order_date,                              # A Order Date
            inv.source,                                  # B Source
            str(it.no),                                  # C No (from invoice)
            it.artist,                                   # D Artist
            it.title,                                    # E Catalog Title
            it.fmt,                                      # F Format
            it.edition,                                  # G Edition
            str(it.qty),                                 # H Qty
            it.upc,                                      # I UPC/Catalog No.
            it.aec,                                      # J AEC Cat (WebAMI only)
            total_items_cell,                            # K Total Items Ordered
            wt_lb_s,                                     # L Wt/PCS (LB)
            wt_kg_s,                                     # M Wt/PCS (KG)
            tot_kg_s,                                    # N Total Wt (KG)
            shipping_cell,                               # O Shipping Cost
            "",                                          # P Forwarder Ship (IDR) -- manual
            "",                                          # Q Vendor Ship (IDR) -- manual
            fmt_price(inv.currency_symbol, it.price),    # R Item Price/PCS
        ]
        rows.append(row)
    return rows


HEADER = [
    "Order Date", "Source", "No", "Artist Name", "Catalog Title",
    "Format", "Edition", "Qty", "UPC/Catalog No.", "AEC Cat",
    "Total Items Ordered", "Weight/PCS (LB)", "Weight/PCS (KG)",
    "Total Weight (KG)", "Shipping Cost", "Forwarder Shipping (IDR)",
    "Vendor Shipping (IDR)", "Item Price/PCS",
]


# ──────────────────────────────────────────────────────────────────────
# P19 — SECRETLY DISTRIBUTION  (Invoice 306688, ship 05/12/2026, USD)
# ──────────────────────────────────────────────────────────────────────
P19 = Invoice(
    source="Secretly Distribution",
    order_date="05/12/2026",
    currency_symbol="$",
    shipping=146.31,           # Freight only (CC fees $33.66 excluded)
    total_units=147,
)
P19.items = [
    Item(1,  "Daniel Pemberton, Baby Rose & Japanese Breakfast", "Materialists (Original Soundtrack)", "LP",  "Iridescent White Vinyl w/ Blue", 1, "810180991131", 15.00),
    Item(2,  "Daniel Lopatin", "Marty Supreme (Original Soundtrack)", "2xLP", "Clear Vinyl", 1, "617308017083", 21.25),
    Item(3,  "Sufjan Stevens", "Illinois", "CD",  "", 2, "656605892627", 6.00),
    Item(4,  "Sufjan Stevens", "Illinois", "2xLP", "", 1, "656605892610", 17.25),
    Item(5,  "Thee Marloes", "Di Hotel Malibu", "CD",  "", 4, "349223020229", 6.00),
    Item(6,  "Thee Marloes", "Di Hotel Malibu", "LP",  "", 1, "349223020212", 11.50),
    Item(7,  "Thee Marloes", "Di Hotel Malibu", "LP",  "Indie Exclusive Clear Emerald Vinyl", 1, "349223020267", 12.50),
    Item(8,  "Powder", "Powder In Space", "CD",  "", 2, "700064953129", 6.00),
    Item(9,  "Powder", "Powder In Space", "12\"", "", 2, "747742391088", 9.00),
    Item(10, "Wild Nothing", "Gemini", "CD",  "", 1, "817949016821", 6.00),
    Item(11, "Wild Nothing", "Nocturne", "Cassette", "", 3, "817949015237", 6.00),
    Item(12, "Mac DeMarco", "Salad Days", "CD", "", 2, "817949019488", 6.00),
    Item(13, "Mac DeMarco", "This Old Dog", "CD", "", 2, "817949013165", 6.00),
    Item(14, "Wild Nothing", "Indigo", "CD", "", 1, "817949014971", 6.00),
    Item(15, "LCD Soundsystem", "American Dream", "Cassette", "", 5, "829732256642", 7.50),
    Item(16, "RIP Magic", "5words", "12\"", "12\" Single", 2, "829732000894", 9.00),
    Item(17, "MJ Lenderman", "Manning Fireworks", "Cassette", "", 2, "617308081022", 6.00),
    Item(18, "Destroyer", "Kaputt", "CD", "", 2, "656605134628", 6.00),
    Item(19, "Destroyer", "Kaputt", "LP", "", 1, "656605134611", 17.75),
    Item(20, "Slowdive", "Slowdive", "CD", "", 1, "656605143224", 6.00),
    Item(21, "Slowdive", "Slowdive", "LP", "", 2, "656605143217", 12.50),
    Item(22, "Phoebe Bridgers", "Stranger In The Alps", "CD", "", 2, "656605144221", 6.00),
    Item(23, "Mitski", "Be The Cowboy", "Cassette", "", 1, "656605346472", 6.00),
    Item(24, "Mitski", "Be The Cowboy", "CD", "", 2, "656605145020", 6.00),
    Item(25, "Phoebe Bridgers", "Punisher", "Cassette", "Fluorescent Green Cassette", 2, "656605373195", 6.00),
    Item(26, "Phoebe Bridgers", "Punisher", "CD", "", 2, "656605150024", 6.00),
    Item(27, "Phoebe Bridgers", "Punisher", "LP", "", 1, "656605150017", 13.50),
    Item(28, "Slowdive", "everything is alive", "CD", "", 3, "656605153223", 6.00),
    Item(29, "Slowdive", "everything is alive", "LP", "", 2, "656605153216", 12.50),
    Item(30, "Bright Eyes", "The People's Key", "CD", "", 2, "656605159829", 6.00),
    Item(31, "Toro y Moi", "MAHAL", "CD", "", 2, "656605160122", 6.00),
    Item(32, "Toro y Moi", "MAHAL", "LP", "", 1, "656605160115", 13.50),
    Item(33, "Mitski", "The Land Is Inhospitable and So Are We", "Cassette", "", 2, "656605165080", 6.00),
    Item(34, "Mitski", "The Land Is Inhospitable and So Are We", "CD", "", 2, "656605165028", 6.00),
    Item(35, "Mitski", "The Land Is Inhospitable and So Are We", "LP", "", 1, "656605165011", 13.00),
    Item(36, "Khruangbin", "A LA SALA", "CD", "", 2, "656605165721", 6.00),
    Item(37, "Avalon Emerson & the Charm", "Written into Changes", "CD", "", 5, "656605166926", 6.00),
    Item(38, "Avalon Emerson & the Charm", "Written into Changes", "LP", "Transparent Red Vinyl", 5, "656605166933", 12.50),
    Item(39, "Greg Mendez", "Beauty Land", "Cassette", "", 1, "656605167374", 6.00),
    Item(40, "Greg Mendez", "Beauty Land", "CD", "", 1, "656605167329", 6.00),
    Item(41, "Wednesday", "Bleeds", "CD", "", 2, "656605172828", 6.00),
    Item(42, "Julie Byrne", "The Greater Wings", "CD", "", 2, "804297841625", 6.00),
    Item(43, "Bullion", "Affection", "CD", "", 2, "804297842929", 6.00),
    Item(44, "Bullion", "Affection", "LP", "", 2, "804297842912", 13.50),
    Item(45, "Ginger Root", "SHINBANGUMI", "Cassette", "", 1, "804297844374", 6.00),
    Item(46, "Ginger Root", "SHINBANGUMI", "CD", "", 2, "804297844329", 6.00),
    Item(47, "C418", "Minecraft: Alpha + Beta", "2xCassette", "", 2, "804297844435", 12.50),
    Item(48, "Bon Iver", "For Emma, Forever Ago", "CD", "", 2, "656605211527", 6.00),
    Item(49, "Bon Iver", "Bon Iver, Bon Iver", "CD", "", 3, "656605213521", 6.00),
    Item(50, "Bon Iver", "Bon Iver", "LP", "", 1, "656605213514", 12.50),
    Item(51, "Sharon Van Etten", "Tramp", "CD", "", 2, "656605220123", 6.00),
    Item(52, "Sharon Van Etten", "Tramp", "LP", "", 1, "656605220116", 12.00),
    Item(53, "Unknown Mortal Orchestra", "II", "CD", "", 2, "656605223223", 6.00),
    Item(54, "Unknown Mortal Orchestra", "II (10 Year Anniversary Reissue)", "2xLP", "Aluminum Vinyl", 2, "617308056426", 16.75),
    Item(55, "Bon Iver", "22, A Million", "CD", "", 2, "656605230023", 6.00),
    Item(56, "Bon Iver", "22, A Million", "LP", "", 1, "656605230016", 17.75),
    Item(57, "Bon Iver", "i,i", "CD", "", 3, "656605235028", 6.00),
    Item(58, "Bon Iver", "i,i", "LP", "", 1, "656605235011", 17.75),
    Item(59, "Bon Iver", "VOLUMES: ONE (Selections From Music Concerts 2019-2023 Bon Iver 6 Piece Band)", "CD", "", 2, "656605248523", 6.00),
    Item(60, "The Softies", "Winter Pageant", "LP", "", 2, "789856106110", 12.50),
    Item(61, "The Softies", "Holiday In Rhode Island", "LP", "", 2, "789856111916", 12.50),
    Item(62, "Adrian Younge", "Younge", "CD", "", 2, "617308035759", 6.00),
    Item(63, "Marietta", "Summer Death", "CD", "", 1, "199438000598", 5.00),
    Item(64, "Destroyer", "Dan's Boogie", "CD", "", 2, "673855086927", 6.00),
    Item(65, "Rostam", "American Stories", "CD", "", 2, "617308041675", 6.00),
    Item(66, "Rostam", "American Stories", "LP", "Sumac Vinyl", 1, "617308034660", 13.00),
    Item(67, "Turnover", "Peripheral Vision", "Cassette", "Green Shell Cassette", 2, "810097919662", 6.00),
    Item(68, "Turnover", "Peripheral Vision", "CD", "", 2, "811774021821", 6.00),
    Item(69, "Basement", "WIRED", "CD", "", 2, "199438001731", 6.00),
    Item(70, "MF DOOM", "Operation: Doomsday", "Cassette", "", 2, "826257035240", 10.00),
    Item(71, "MF DOOM", "MM..FOOD (20th Anniversary Edition)", "CD", "", 2, "826257040022", 6.00),
    Item(72, "Yeah Yeah Yeahs", "Cool It Down", "CD", "", 3, "656605047027", 6.00),
    Item(73, "Yeah Yeah Yeahs", "Cool It Down", "LP", "", 1, "656605047010", 13.50),
    Item(74, "Hatchie", "Liquorice", "CD", "", 2, "656605050324", 6.00),
    Item(75, "Hatchie", "Liquorice", "LP", "", 1, "656605050317", 12.00),
    Item(76, "Hatchie", "Liquorice", "LP", "Lipstick Red Vinyl", 1, "656605050331", 12.50),
    Item(77, "POND", "The Early Years: 2008 - 2010", "2xLP 180g", "Mango Vinyl", 1, "612789326273", 19.25),
    # Page 3 shipped items (qty > 0)
    Item(81, "Sufjan Stevens", "The Age of Adz", "CD", "", 1, "656605607726", 6.00),
    Item(82, "Thee Marloes", "Perak", "CD", "", 2, "349223017922", 6.00),
]

# ──────────────────────────────────────────────────────────────────────
# P12 — ALLIANCE ENTERTAINMENT / WebAMI  (Invoice PLS93610834, 03/04/26, USD)
# ──────────────────────────────────────────────────────────────────────
P12 = Invoice(
    source="Alliance Entertainment (WebAMI)",
    order_date="03/04/2026",
    currency_symbol="$",
    shipping=179.16,
    total_units=61,
)
P12.items = [
    Item(1,  "Gorillaz", "Mountain", "LP", "", 2, "", 24.75, aec="KSEX1.1"),
    Item(2,  "Loaded Honey", "Love Made Trees", "LP", "", 3, "", 24.49, aec="TTYP1.1"),
    Item(3,  "Stone Roses", "Stone Roses", "LP", "", 2, "", 17.82, aec="SNYL304199.1"),
    Item(4,  "Dijon", "Baby", "LP", "", 5, "", 24.25, aec="WB728452.1"),
    Item(5,  "Just Mustard", "We Were Just Here Forever", "LP", "", 1, "", 18.99, aec="PASN179613.1"),
    Item(6,  "Last Dinner Party", "From The Pyre", "LP", "", 2, "", 21.75, aec="ISL194689.1"),
    Item(7,  "Taylor Swift", "The Life of a Showgirl", "LP", "", 3, "", 27.99, aec="RPBL207407.1"),
    Item(8,  "Olivia Dean", "The Art Of Loving", "LP", "", 5, "", 27.25, aec="ISL182769.1"),
    Item(9,  "Sabrina Carpenter", "Man's Best Friend", "LP", "", 1, "", 27.25, aec="ISL179911.1"),
    Item(10, "Blood Orange", "Essex Honey", "LP", "", 2, "", 23.52, aec="RCA294496.1"),
    Item(11, "Billie Eilish", "Hit Me Hard And Soft", "LP", "", 2, "", 27.25, aec="ISC172098.1"),
    Item(12, "Slowdive", "Souvlaki", "LP", "", 2, "", 19.24, aec="SNYL288605.1"),
    Item(13, "Lady Gaga", "Mayhem", "LP", "", 2, "", 33.25, aec="ISC169133.1"),
    Item(14, "Sabrina Carpenter", "Short n' Sweet", "LP", "", 1, "", 27.80, aec="ISL159350.1"),
    Item(15, "Last Dinner Party", "Prelude to Ecstasy", "LP", "", 1, "", 23.96, aec="ISL141479.1"),
    Item(16, "boygenius", "the record", "LP", "", 1, "", 22.94, aec="ISCB003733201.1"),
    Item(17, "The Strokes", "The New Abnormal", "LP", "", 2, "", 18.18, aec="RCA970588.1"),
    Item(18, "Harry Styles", "Fine Line", "LP", "", 2, "", 26.89, aec="CLBI397051.1"),
    Item(19, "Tyler, The Creator", "IGOR", "LP", "", 2, "", 19.62, aec="CLBI596522.1"),
    Item(20, "Air", "Moon Safari", "LP", "", 2, "", 20.86, aec="RPLH666441.1"),
    Item(21, "Taylor Swift", "1989", "LP", "", 2, "", 19.75, aec="BMCHBMRBD0500E.1"),
    Item(22, "MGMT", "Oracular Spectacular", "LP", "", 2, "", 19.62, aec="SNYL304532.1"),
    Item(23, "MGMT", "Congratulations", "LP", "", 2, "", 25.95, aec="SNYL304533.1"),
    Item(24, "Kodaline", "In A Perfect World", "LP", "", 1, "", 23.99, aec="SNUK3704761.1"),
    Item(25, "The Flaming Lips", "Yoshimi Battles The Pink Robots", "LP", "", 3, "", 21.06, aec="WB530200.1"),
    Item(26, "Kasabian", "Kasabian", "LP", "", 1, "", 21.99, aec="IMT698857.1"),
    Item(27, "Talking Heads", "Remain In Light", "LP", "", 1, "", 21.06, aec="RHI70802.1"),
    Item(28, "The Strokes", "First Impressions Of Earth", "LP", "", 2, "", 18.90, aec="RCA73177.1"),
    Item(29, "The Strokes", "Is This It", "LP", "", 2, "", 15.99, aec="RCA68045.1"),
    Item(30, "Tame Impala", "Innerspeaker", "CD", "", 2, "", 8.69, aec="MODU126.2"),
]

# ──────────────────────────────────────────────────────────────────────
# P18 — JUNO RECORDS  (Order C13947644, 04/02/2026, EUR)
# ──────────────────────────────────────────────────────────────────────
P18 = Invoice(
    source="Juno Records",
    order_date="04/02/2026",
    currency_symbol="€",
    shipping=272.74,
    total_units=0,    # filled below
)
P18.items = [
    Item(1,  "Alex Turner", "Submarine", "CD Single", "6-Track", 2, "RUG 398CD", 4.52),
    Item(2,  "Oneohtrix Point Never", "R Plus Seven", "2xLP", "Gatefold + MP3 Download", 1, "WARPLP 240", 21.18),
    Item(3,  "Cocteau Twins", "Heaven Or Las Vegas (Remastered)", "LP 180g", "180 Gram Audiophile", 2, "CAD 3420", 18.52),
    Item(4,  "AIAIAI", "AIAIAI Tracks Hi-Fi Headphones with One Button Mic", "Headphones", "", 1, "AIAIAI 05601", 46.09),
    Item(5,  "Harry Styles", "Harry Styles", "CD", "", 1, "889854 36772", 8.83),
    Item(6,  "Zero 7", "When It Falls", "2xLP", "Heavyweight Vinyl", 1, "NEW 9271LP", 25.63),
    Item(7,  "My Bloody Valentine", "Loveless (Reissue)", "LP", "Gatefold Heavyweight + MP3 Download", 1, "REWIGLP 159", 22.18),
    Item(8,  "My Bloody Valentine", "Loveless (Reissue)", "2xCD", "", 2, "REWIGCD 159", 10.98),
    Item(9,  "Harry Styles", "Harry's House", "CD", "", 1, "196587 07272", 7.58),
    Item(10, "Dijon", "Absolutely", "LP", "Brown Vinyl", 2, "009362 4876687", 32.73),
    Item(11, "Geese", "3D Country", "CD", "", 1, "PTPS 10CD", 9.69),
    Item(12, "Olivia Dean", "Messy", "LP", "", 2, "EMIV 2093", 22.83),
    Item(13, "Bosq/Kaleta", "Meji Meji", "12\"", "", 1, "BAC 010", 12.91),
    Item(14, "Air", "Moon Safari (25th Anniversary Edition)", "CD+Blu-ray", "Limited 2xCD + Blu-ray", 1, "505419 7906770", 19.17),
    Item(15, "AIAIAI", "AIAIAI Tracks Headphones With One Button Mic", "Headphones", "B-Stock", 1, "AIAIAI 05601 (B-STOCK)", 43.93),
    Item(16, "Cameron Winter", "Heavy Metal", "CD", "", 1, "PTPS 50CD", 9.69),
    Item(17, "Vegyn/Air", "Blue Moon Safari", "CD", "", 2, "289970 6", 18.22),
    Item(18, "Olivia Dean", "The Art Of Loving", "CD", "", 5, "781632 1", 9.26),
    Item(19, "Olivia Dean", "The Art Of Loving", "LP", "", 2, "781633 2", 25.83),
    Item(20, "Loaded Honey", "Love Made Trees", "LP", "Die-Cut Sleeve", 1, "VET 001B", 20.89),
    Item(21, "Geese", "Getting Killed", "CD", "", 5, "PTPS 60CD", 8.40),
    Item(22, "Various Artists", "Oriental Rare Groove: Rare Funky Songs From The Arabic World", "2xLP", "", 1, "343112 6", 22.83),
    Item(23, "Rosalia", "Lux", "CD", "", 2, "198029 90922", 10.55),
    Item(24, "Oneohtrix Point Never", "Tranquilizer", "CD", "", 1, "WARPCD 411", 10.33),
    Item(25, "Loaded Honey", "Love Made Trees", "LP", "Transparent Orange Marbled Vinyl, Die-Cut Sleeve", 1, "VET 001", 20.89),
    Item(26, "Daphni", "Butterfly", "CD", "", 1, "JIAOLONG 034CD", 9.26),
    Item(27, "Robyn", "Sexistential", "CD", "", 2, "YO 467CD", 9.26),
    Item(28, "Robyn", "Sexistential", "Cassette", "", 1, "YO 467MCE", 9.26),
    Item(29, "Fcukers", "O", "LP", "Spot-Varnished Sleeve (Indie Exclusive)", 1, "ZEN 324N", 19.60),
    Item(30, "Fcukers", "O", "CD", "", 2, "ZENCD 324", 9.26),
    Item(31, "Harry Styles", "Kiss All The Time Disco Occasionally", "CD", "", 3, "199584 17732", 11.84),
    Item(32, "Harry Styles", "Kiss All The Time Disco Occasionally", "LP", "Gatefold Neptune Vinyl + Booklet", 2, "199584 33991", 26.92),
    Item(33, "Kangding Ray", "Sirat (Soundtrack)", "CD", "", 1, "INV 345CD", 10.55),
    Item(34, "Avalon Emerson & The Charm", "Written Into Changes", "LP", "Limited Translucent Red Vinyl", 2, "DOC 369LPC1", 19.60),
    Item(35, "Avalon Emerson & The Charm", "Written Into Changes", "CD", "", 2, "DOC 369CD", 10.55),
    Item(36, "Various Artists", "Help (2)", "2xLP", "Gatefold + 1-Sided 7\"", 2, "WARCHILD 16LP", 25.63),
    Item(37, "Various Artists", "Help (2)", "2xCD", "Unmixed", 3, "WARCHILD 16CD", 12.71),
    Item(38, "James Blake", "Trying Times", "CD", "", 2, "870483 4653", 10.98),
    Item(39, "James Blake", "Trying Times", "2xLP", "Gatefold", 1, "870483 4592", 25.83),
    Item(40, "James Blake", "Trying Times", "2xLP", "Gatefold White Vinyl (Indie Exclusive)", 1, "870483 4639", 28.86),
    Item(41, "Ye (Kanye West)", "Bully", "LP", "", 2, "YZYGAMMA 001", 20.89),
    Item(42, "Ye (Kanye West)", "Bully", "CD", "", 3, "YZYGAMMA 002CD", 9.26),
    Item(43, "Ye (Kanye West)", "Bully", "Cassette", "", 2, "YZYGAMMA 003", 10.98),
    Item(44, "A$AP Rocky", "Don't Be Dumb", "CD", "", 1, "199584 310824CD", 10.98),
    Item(45, "Vick Lavender", "The Esthetic EP", "12\"", "Limited", 1, "CAT 015", 12.91),
    Item(46, "Maleet", "Caridad", "7\"", "Yellow Vinyl", 1, "PTF 010Y", 16.15),
]
P18.total_units = sum(i.qty for i in P18.items)


def write_block(path: str, inv: Invoice, include_header: bool):
    rows = build_block(inv)
    with open(path, 'w', encoding='utf-8') as f:
        if include_header:
            f.write('\t'.join(HEADER) + '\n')
        for r in rows:
            f.write('\t'.join(r) + '\n')


def main():
    base = '/Users/sonatsu/Documents/Projects/Claude/MediumFormat/import_output'
    write_block(f'{base}/P19_secretly.tsv', P19, include_header=True)
    write_block(f'{base}/P12_alliance_webami.tsv', P12, include_header=True)
    write_block(f'{base}/P18_juno.tsv', P18, include_header=True)

    # Combined block — emit both variants so paste behavior is unambiguous
    rows_all = [r for inv in (P19, P12, P18) for r in build_block(inv)]
    with open(f'{base}/ALL_combined.tsv', 'w', encoding='utf-8') as f:
        f.write('\t'.join(HEADER) + '\n')
        for r in rows_all:
            f.write('\t'.join(r) + '\n')
    with open(f'{base}/ALL_combined_WITHHEADER.tsv', 'w', encoding='utf-8') as f:
        f.write('\t'.join(HEADER) + '\n')
        for r in rows_all:
            f.write('\t'.join(r) + '\n')
    with open(f'{base}/ALL_combined_NOHEADER.tsv', 'w', encoding='utf-8') as f:
        for r in rows_all:
            f.write('\t'.join(r) + '\n')

    # Summary
    for inv in (P19, P12, P18):
        units = sum(i.qty for i in inv.items)
        lines = len(inv.items)
        print(f'{inv.source}: {lines} rows, {units} units, shipping {inv.currency_symbol}{inv.shipping:.2f}')


if __name__ == '__main__':
    main()
