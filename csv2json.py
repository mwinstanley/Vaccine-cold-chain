# Melissa Winstanley
# mwinst@cs.washington.edu
#
# Use for converting csv file to JSON. Give file name on the command line.

import csv
import json
import sys

def convert(name):
    if name.endswith('.csv'):
        f = open(name, 'r')
        reader = csv.DictReader(f)
        out = json.dumps( [ row for row in reader ], indent=4)
        newName = name[0:len(name)-3] + 'json'
        fout = open(newName, 'w')
        fout.write(out)
        fout.close()
        f.close()

if __name__ == '__main__':
    convert(sys.argv[1]);
