import unittest
from resource_stock import parse_amount,extract_stock

def rows(values):
    return [([[i*100,0],[i*100+60,0],[i*100+60,15],[i*100,15]],v,.99) for i,v in enumerate(values)]

class ResourceStockTests(unittest.TestCase):
    def test_abbreviations_and_grouping(self):
        for text,value in [('20.2M',20200000),('22,3M',22300000),('19.0M',19000000),('8.8M',8800000),('19.336',19336),('500K',500000),('0',0)]:
            self.assertEqual(parse_amount(text),value)
        self.assertIsNone(parse_amount('20.2'));self.assertIsNone(parse_amount('foo'))
    def test_gems_are_not_farm_resources(self):
        self.assertEqual(extract_stock(rows(['20.2M','22.3M','19.0M','8.8M','19.336'])),dict(food=20200000,wood=22300000,stone=19000000,gold=8800000))
        self.assertIsNone(extract_stock(rows(['20.2M','19.0M','8.8M','19.336'])))
