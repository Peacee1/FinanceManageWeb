import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
import threading

import numpy as np

from characters import Character, extract_stars, name_key, CharacterNavigator,same_name,same_identity


def row(text, x, y, width=250):
    return [[[x, y], [x+width, y], [x+width, y+20], [x, y+20]], text, .96]


class CharacterParsingTests(unittest.TestCase):
    def test_find_accepts_unique_name_after_kingdom_change(self):
        target=Character('2771:peacee1f3','Peacee1X F3','2771',(600,500),active=True)
        app=SimpleNamespace(vision=None,stop=threading.Event(),log=Mock());nav=CharacterNavigator(app);nav.open_list=Mock()
        nav.page=Mock(return_value=([target],True,True,None,(0,0)))
        self.assertIs(nav.find('C13304:peacee1f3')[0],target)

    def test_changed_kingdom_does_not_guess_between_duplicate_names(self):
        chars=[Character('2771:peacee1f3','Peacee1X F3','2771',(600,500)),Character('4194:peacee1f3','Peacee1X F3','4194',(900,500))]
        app=SimpleNamespace(vision=None,stop=threading.Event(),log=Mock());nav=CharacterNavigator(app);nav.open_list=Mock();nav.page=Mock(return_value=(chars,True,True,None,(0,0)))
        with self.assertRaises(RuntimeError):nav.find('C13304:peacee1f3')
    def test_unknown_loading_never_sends_escape(self):
        app=SimpleNamespace(vision=Mock(),stop=threading.Event(),log=Mock())
        nav=CharacterNavigator(app);nav.pause=Mock();nav.key=Mock()
        nav.inspect=Mock(side_effect=[(None,None,None,[],[]),('outside',None,None,[],[])])
        nav.close_to_map();nav.key.assert_not_called();nav.pause.assert_called_once_with(2)

    def test_open_list_waits_for_loading_without_escape(self):
        app=SimpleNamespace(vision=Mock(),stop=threading.Event(),log=Mock());nav=CharacterNavigator(app)
        screen=np.zeros((900,1600,3),np.uint8)
        nav.pause=Mock();nav.key=Mock();nav.guard=Mock()
        nav.inspect=Mock(side_effect=[(None,screen,(0,0),[],[]),('characters',screen,(0,0),[],[])])
        with patch('characters.pg.moveTo'),patch('characters.pg.scroll'):
            nav.open_list()
        nav.key.assert_not_called()

    def test_exit_dialog_cancel_is_clicked_before_entering_game(self):
        screen=np.zeros((900,1600,3),np.uint8);screen[528:584,847:1013]=(255,180,0)
        rows=[row('Thoát trò chơi?',735,435,130),row('HỦY',900,540,60),row('XÁC NHẬN',600,540,140)]
        app=SimpleNamespace(vision=Mock(),log=Mock());nav=CharacterNavigator(app);nav.click=Mock()
        nav.cancel_exit(screen,(0,0),rows)
        nav.click.assert_called_once_with((930,550),(0,0))
    def test_ocr_letter_one_match_preserves_governor_and_realm(self):
        self.assertTrue(same_name('PeaceelX F10','[T~UW]Peacee1乂 F10'))
        self.assertTrue(same_identity('2771:peaceelf10','2771:peacee1f10'))
        self.assertFalse(same_name('PeaceelX F10','Peacee1X F11'))
        self.assertFalse(same_identity('2771:peaceelf10','4194:peacee1f10'))
        self.assertFalse(same_name('PeaceelX F10','Peacee1 F1'))
    def test_enter_game_waits_through_loading_without_escape(self):
        app=SimpleNamespace(vision=Mock(), log=Mock(), active=Mock(return_value=True))
        nav=CharacterNavigator(app)
        app.vision.from_rows.return_value=SimpleNamespace(buttons={'enter_game':(200,400)})
        nav.click=Mock();nav.pause=Mock();nav.key=Mock()
        nav.inspect=Mock(side_effect=[(None,None,None,None,None), ('start_screen',None,None,None,None), ('outside',None,None,None,None)])
        nav.enter_game(np.zeros((600,1000,3),np.uint8),(0,0),[])
        nav.click.assert_called_once_with((200,400),(0,0))
        nav.key.assert_not_called()
        self.assertEqual(nav.inspect.call_count,3)

    def test_loading_recovers_game_window_without_sending_keys(self):
        app=SimpleNamespace(vision=Mock(),active=Mock(side_effect=[False,True]))
        nav=CharacterNavigator(app);nav.pause=Mock();nav.key=Mock()
        with patch('game_window.GameWindow.find') as find:
            self.assertTrue(nav.recover_loading_window())
            find.return_value.focus.assert_called_once()
        nav.key.assert_not_called()

    def test_transition_guard_recovers_focus_and_respects_stop(self):
        app=SimpleNamespace(vision=Mock(),active=Mock(return_value=False),stop=threading.Event())
        nav=CharacterNavigator(app);nav.transition_deadline=float('inf');nav.pause=Mock()
        nav.recover_loading_window=Mock(side_effect=[False,True])
        nav.guard()
        self.assertEqual(nav.recover_loading_window.call_count,2)
        app.stop.set()
        with self.assertRaises(RuntimeError): nav.guard()

    def test_power_belongs_to_correct_star_character(self):
        rows=[row('NHÂN VẬT NGÔI SAO',900,245),row('NHÂN VẬT THƯỜNG',900,780),row('Farm F1',605,300),row('#2771 Vương quốc Yorkshire',605,325),row('Sức mạnh: 17.142.312',605,348),row('Farm F2',1100,300),row('#2771 Vương quốc Yorkshire',1100,325),row('Sức mạnh: 6.815.183',1100,348)]
        chars,_,_=extract_stars(rows,(994,1770,3))
        self.assertEqual({c.name:c.power for c in chars},{'Farm F1':17142312,'Farm F2':6815183})

    def test_only_stars_and_ignore_avatar_lettering(self):
        rows = [row('NHÂN VẬT NGÔI SAO', 900, 245), row('NHÂN VẬT THƯỜNG', 900, 780),
                row('[T_UW]Peacee1 Do', 605, 408), row('KEDAVRA', 505, 430, 80),
                row('#C13304 Vương quốc đã mất', 605, 434),
                row('[T~UW]Peacee1X F7', 1125, 289), row('#2771 Vương quốc Yorkshire', 1125, 314),
                row('Peacee1 F4', 1125, 810), row('#2771 Vương quốc Yorkshire', 1125, 835)]
        chars, normal, known = extract_stars(rows, (1000, 1770, 3))
        self.assertEqual({c.identity for c in chars}, {'C13304:peacee1do', '2771:peacee1f7'})
        self.assertTrue(normal)
        self.assertTrue(known)

    def test_no_group_assumption_on_first_page(self):
        rows = [row('Test', 605, 300), row('#2771 Vương quốc Yorkshire', 605, 325)]
        self.assertEqual(extract_stars(rows, (1000, 1770, 3))[0], [])
        self.assertEqual(len(extract_stars(rows, (1000, 1770, 3), in_stars=True)[0]), 1)

    def test_guild_and_decoration_do_not_change_identity(self):
        self.assertEqual(name_key('[T_UW]Peacee1乂 F7'), name_key('[T~UW]Peacee1X F7'))

    def test_alliance_label_ocr_typo(self):
        nav = CharacterNavigator(SimpleNamespace(vision=None))
        screen = np.zeros((1000, 1770, 3), np.uint8)
        self.assertEqual(nav.text_point([('laanhtho', (1130, 600), 'Laänh tho')], 'lanhtho', screen), (1130, 600))

    def test_dynamic_rosters_five_ten_fifteen(self):
        for count in [5, 10, 15]:
            characters = [Character(str(i), 'Name '+str(i), '2771', (600, 300)) for i in range(count)]
            pages = []
            for offset in range(0, count, 4):
                pages.append((characters[offset:offset+4], offset+4 >= count, True, None, (0, 0)))
            nav = CharacterNavigator(SimpleNamespace(vision=None, stop=threading.Event()))
            nav.open_list = Mock()
            nav.page = Mock(side_effect=pages)
            nav.scroll_page = Mock()
            self.assertEqual(len(nav.scan()), count)

    def test_overlapping_pages_are_deduplicated(self):
        characters = [Character(str(i), 'Name '+str(i), '2771', (600, 300)) for i in range(10)]
        nav = CharacterNavigator(SimpleNamespace(vision=None, stop=threading.Event()))
        nav.open_list = Mock()
        nav.scroll_page = Mock()
        nav.page = Mock(side_effect=[(characters[:6], False, True, None, (0, 0)),
                                     (characters[4:], True, True, None, (0, 0))])
        self.assertEqual(len(nav.scan()), 10)

    def test_territory_click_targets_flag_above_label(self):
        screen = np.zeros((1000, 1770, 3), np.uint8)
        vision = SimpleNamespace(icon=Mock(return_value=(.95, (1130, 540))))
        app = SimpleNamespace(vision=vision, log=Mock())
        nav = CharacterNavigator(app)
        nav.close_to_map = Mock()
        nav.key = Mock()
        nav.click = Mock()
        nav.inspect = Mock(side_effect=[('alliance', screen, (0, 0), [], [('lanhtho', (1130, 605), 'Lãnh thổ')]),
                                       ('territory', screen, (0, 0), [], [('nhan', (1250, 280), 'NHẬN')])])
        nav.claim_alliance()
        self.assertEqual(nav.click.call_args_list[0].args[0], (1130, 540))
        self.assertEqual(nav.click.call_args_list[1].args[0], (1250, 280))
        self.assertEqual(vision.icon.call_args.args[0], 'alliance_flag')

    def test_small_profile_does_not_require_perfect_action_point_text(self):
        screen = np.zeros((718, 958, 3), np.uint8)
        rows = [row('Thong doc', 20, 190, 70), row('(ID:170869450)', 185, 190, 85),
                row('Diem harh dong.', 20, 155, 95)]
        vision = SimpleNamespace(engine=Mock(return_value=(rows, None)))
        app = SimpleNamespace(vision=vision, stop=threading.Event(), active=lambda: True,
                              snapshot=lambda: (screen, (1, 31)))
        state, *_ = CharacterNavigator(app).inspect()
        self.assertEqual(state, 'profile')

    def test_ui_label_accepts_half_similarity_and_chooses_best(self):
        nav = CharacterNavigator(SimpleNamespace(vision=None))
        screen = np.zeros((1000, 1770, 3), np.uint8)
        texts = [('lanhzzz', (100, 200), ''), ('khac', (100, 400), '')]
        self.assertEqual(nav.text_point(texts, 'lanhtho', screen), (100, 200))

    def test_ui_label_rejects_equal_ambiguous_matches(self):
        nav = CharacterNavigator(SimpleNamespace(vision=None))
        with self.assertRaises(RuntimeError):
            nav.text_point([('nhan', (100, 200), ''), ('nhan', (300, 200), '')], 'nhan', None)


if __name__ == '__main__':
    unittest.main()

class ReturnOutsideTests(unittest.TestCase):
 def test_escape_has_no_nine_action_limit(self):
  app=SimpleNamespace(vision=Mock(),stop=threading.Event(),log=Mock())
  nav=CharacterNavigator(app);nav.key=Mock();nav.pause=Mock()
  nav.inspect=Mock(side_effect=[('settings',None,None,[],[])]*12+[('outside',None,None,[],[])])
  nav.close_to_map();self.assertEqual(nav.key.call_count,12)
 def test_inside_switches_to_outside(self):
  app=SimpleNamespace(vision=Mock(),stop=threading.Event(),log=Mock())
  nav=CharacterNavigator(app);nav.key=Mock();nav.pause=Mock()
  nav.inspect=Mock(side_effect=[('inside',None,None,[],[]),('outside',None,None,[],[])])
  nav.close_to_map();nav.key.assert_called_once_with('space')
 def test_loading_never_escapes(self):
  app=SimpleNamespace(vision=Mock(),stop=threading.Event(),log=Mock())
  nav=CharacterNavigator(app);nav.key=Mock();nav.pause=Mock()
  nav.inspect=Mock(side_effect=[('loading',None,None,[],[]),('outside',None,None,[],[])])
  nav.close_to_map();nav.key.assert_not_called()
