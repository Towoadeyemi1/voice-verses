# Cross-references

`cross-references.json` comes from the OpenBible.info cross-reference data,
licensed **CC BY** (https://www.openbible.info/labs/cross-references/).
The app credits it in Settings → Bible.

It keeps, for each verse, the 10 cross-references with the most votes (at
least 4). Keys and values are verse numbers written in hexadecimal:
`book index × 1,000,000 + chapter × 1,000 + verse`, with books in the usual
order (Genesis = 0 … Revelation = 65). A range keeps its first verse.

Rebuild it with:

```sh
curl -LO https://a.openbible.info/data/cross-references.zip
python3 tools/data/build-cross-references.py cross-references.zip 10 4 src/data/cross-references.json
```
