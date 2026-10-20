#!/usr/bin/env bash
# Bunyan — fact counter for js/knowledge/
# Usage: tools/count-facts.sh [section]   e.g. tools/count-facts.sh 1.3
#
# The rule, so counts are comparable between sections:
#   a src:"<section>" tag applies to the object it sits in, including everything nested
#   inside it, until that object's closing brace — then the enclosing object's src
#   applies again. Every quoted string is one fact, and so is every bare number value.
#   Keys are unquoted in these files, so a quoted string is always a value.
#   The src, topic and id values themselves are bookkeeping and are not counted, and
#   neither is agentReading: that is Bunyan's interpretation, not a fact from the source.
#   Comments are skipped. Nothing before the first src (the meta block) is counted.
# It is a proxy, not a truth: its job is to make a thin section stand out.
set -euo pipefail
dir="$(cd "$(dirname "$0")/.." && pwd)/js/knowledge"
want="${1:-}"
for f in "$dir"/*.js; do
  awk -v want="$want" -v file="$(basename "$f")" '
    function count() { pend[depth]++; if (sp > 0) c[ssrc[sp]]++ }
    BEGIN { depth = 0; sp = 0; incom = 0 }
    {
      line = $0; n = length(line); i = 1
      while (i <= n) {
        two = substr(line, i, 2); ch = substr(line, i, 1)
        if (incom) { if (two == "*/") { incom = 0; i += 2 } else i++; continue }
        if (two == "/*") { incom = 1; i += 2; continue }
        if (two == "//") break
        if (ch == "{") { depth++; pend[depth] = 0; pendsrc[depth] = (sp > 0 ? ssrc[sp] : ""); i++; continue }
        if (ch == "}") { if (sp > 0 && sdep[sp] == depth) sp--; depth--; i++; continue }
        # key:"value" or bare "value"
        if (ch == "\"") {
          j = index(substr(line, i + 1), "\""); if (j == 0) break
          val = substr(line, i + 1, j - 1)
          pre = substr(line, 1, i - 1)
          key = ""; if (match(pre, /[A-Za-z_]+:[ ]*$/)) { key = substr(pre, RSTART, RLENGTH); sub(/:[ ]*$/, "", key) }
          if (key == "src") {
            # a src that comes after other values in its object claims them too
            if (pendsrc[depth] != "") c[pendsrc[depth]] -= pend[depth]
            if (pend[depth] > 0) { pendc[depth] = pend[depth]; c[val] += pend[depth] }
            sp++; ssrc[sp] = val; sdep[sp] = depth
          }
          else if (key != "topic" && key != "id" && key != "agentReading") count()
          i += j + 1; continue
        }
        if (ch == ":" && match(substr(line, i + 1), /^[ ]*-?[0-9]+(\.[0-9]+)?/)) {
          count(); i += RLENGTH + 1; continue
        }
        i++
      }
    }
    END { for (s in c) if (want == "" || s == want) printf "%s\t%s\t%d\n", s, file, c[s] }
  ' "$f"
done | sort -t$'\t' -k1,1V -k2,2
