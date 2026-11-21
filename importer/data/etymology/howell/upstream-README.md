This work is based entirely on the pdf "Etymological Dictionary of Han/Chinese Characters" by Lawrence J. Howell
with research collaborator Hikaru Morimoto. I have received permission from Howell to distribute his work under 
a MIT license (which has been included in the "Licenses" folder). I am also distributing the code and resultant 
files under an MIT license. This means the files contained herein are available for free with very 
limited restriction on their usage. For specifics, please see the respective licenses. 

# Step by step process of producing the final database from the Howell's Etymology pdf
Note: If you simply want access to the resultant database, see "data/howell_etymology_text_database.txt"

0. Review configuration details in "Python_config_Details.md"
1. The raw pdf + howell_pdf_to_raw_txt.py -> howell_etymology.txt
2. howell_etymology.txt + howell_raw_txt_to_txt_database.py -> howell_etymology_intermediary.txt 
    (Contains string representations of RawEtymologyHowellEntry objects)

# Overview of database structure
    The database consists 8 distinct elements that can be read into and out of a python program using the 
interface provided by the "RawEtymologyHowellEntry" class found in the similarly named python file. The 
text in the database was encoded in utf-8. The data in the database is essentially an intact version of 
the pdf with the preamble removed, however, for all entries in the pdf marked "(Shinjitai)", I have 
simply re-iterated the kanji and its stroke-count in the "shinjitai" and "shinjitai_stroke_count" entries. 
There are only 6 such entries in the database

# Python Configuration
## Packages

### Core Packages

    python 3.12.5 
        - "wide" build for unicode

    pypdf 4.3.1 
        - BSD License
        - https://pypi.org/project/pypdf/

### Supporting Packages 

    pip 24.2

    typing_extensions 4.12.2

    wheel 0.44.0

    setuptools 73.0.1
