"""Standalone PC client: local settings/progress and no fleet connection."""
import sys
sys.argv[:]=[arg for arg in sys.argv if arg not in {'--ldplayer','--fleet'}]
if '--offline' not in sys.argv:sys.argv.append('--offline')
from bot import App
if __name__=='__main__':App()
