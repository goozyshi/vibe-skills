#!/bin/bash
# 计算指定日期所在周的起止日期和ISO周号
# 用法: bash extract-week-range.sh <date>
# 参数:
#   date: YYYY-MM-DD 格式
# 输出: 起始日期 结束日期 ISO周号（空格分隔）

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "用法: $0 <date>" >&2
    echo "示例: $0 2026-03-21" >&2
    exit 1
fi

DATE="$1"

# 验证日期格式
if ! date -j -f "%Y-%m-%d" "$DATE" >/dev/null 2>&1; then
    echo "错误: 日期格式无效，需要 YYYY-MM-DD 格式" >&2
    exit 1
fi

# 获取当前日期是星期几 (1-7, 周一为1, 周日为7)
DAY_OF_WEEK=$(date -j -f "%Y-%m-%d" "$DATE" "+%u")

# 计算到本周一的天数差
DAYS_TO_MONDAY=$((DAY_OF_WEEK - 1))

# 计算本周一和周日
MONDAY=$(date -j -v-"${DAYS_TO_MONDAY}d" -f "%Y-%m-%d" "$DATE" "+%Y-%m-%d")
SUNDAY=$(date -j -v+"$((7 - DAY_OF_WEEK))d" -f "%Y-%m-%d" "$DATE" "+%Y-%m-%d")

# 获取ISO周号
WEEK_NUMBER=$(date -j -f "%Y-%m-%d" "$DATE" "+%V")

echo "$MONDAY $SUNDAY $WEEK_NUMBER"
