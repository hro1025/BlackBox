#!/usr/bin/env bash
# loc.sh: count non-empty lines of TypeScript per package, source vs tests.
# Run from the repository root: bash loc.sh
# Uses git to list files, so node_modules and everything in .gitignore is skipped.
# New files that are not committed yet are included.

# Reads file names on stdin, prints the number of non-empty lines in them.
count_lines() {
  xargs -r cat | grep -c -v '^[[:space:]]*$'
}

# Lists the TypeScript files below the folder given as $1.
list_files() {
  git ls-files --cached --others --exclude-standard -- "$1" | grep -E '\.tsx?$'
}

printf "%-12s %8s %8s\n" "package" "source" "tests"

total_source=0
total_tests=0

for dir in packages/*/; do
  name=$(basename "$dir")
  source_lines=$(list_files "$dir" | grep -v '\.test\.tsx\?$' | count_lines)
  test_lines=$(list_files "$dir" | grep '\.test\.tsx\?$' | count_lines)

  printf "%-12s %8d %8d\n" "$name" "$source_lines" "$test_lines"

  total_source=$((total_source + source_lines))
  total_tests=$((total_tests + test_lines))
done

printf "%-12s %8d %8d\n" "total" "$total_source" "$total_tests"
