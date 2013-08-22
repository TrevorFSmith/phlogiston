'''Phlogiston is a Django app which maps Tasty Pie APIs to Backbone.js Models and Collections.'''
from sys import argv  

# True if this process was called as a test
IS_TEST = argv and len(argv) >= 2 and argv[1] == "test"

# Copyright 2013 Trevor F. Smith (http://trevor.smith.name/)  Some rights reserved: http://opensource.org/licenses/MIT 