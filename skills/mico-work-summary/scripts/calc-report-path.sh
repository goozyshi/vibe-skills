#!/bin/bash
# 根据日期和周期类型计算报告文件路径
# 用法: bash calc-report-path.sh <date> <period>
# 参数:
#   date: YYYY-MM-DD 格式
#   period: weekly | monthly | yearly
# 输出: 绝对路径

set -euo pipefail

if [ $# -ne 2 ]; then
    echo "用法: $0 <date> <period>" >&2
    echo "示例: $0 2026-03-21 weekly" >&2
    exit 1
fi

DATE="$1"
PERIOD="$2"
BASE_DIR="$HOME/mico-work-summary"

# 验证日期格式
if ! date -j -f "%Y-%m-%d" "$DATE" >/dev/null 2>&1; then
    echo "错误: 日期格式无效，需要 YYYY-MM-DD 格式" >&2
    exit 1
fi

# 提取年月
YEAR=$(date -j -f "%Y-%m-%d" "$DATE" "+%Y")
MONTH=$(date -j -f "%Y-%m-%d" "$DATE" "+%m")

case "$PERIOD" in
    weekly)
        # 周报: 找到本周五的日期
        # 获取当前日期是星期几 (1-7, 周一为1, 周日为7)
        DAY_OF_WEEK=$(date -j -f "%Y-%m-%d" "$DATE" "+%u")
        
        # 计算到周五的天数差
        if [ "$DAY_OF_WEEK" -le 5 ]; then
            DAYS_TO_FRIDAY=$((5 - DAY_OF_WEEK))
        else
            # 如果是周六或周日，找下周五
            DAYS_TO_FRIDAY=$((7 - DAY_OF_WEEK + 5))
        fi
        
        # 计算周五日期
        FRIDAY_DATE=$(date -j -v+"${DAYS_TO_FRIDAY}d" -f "%Y-%m-%d" "$DATE" "+%Y-%m-%d")
        FRIDAY_YEAR=$(echo "$FRIDAY_DATE" | cut -d'-' -f1)
        FRIDAY_MONTH=$(echo "$FRIDAY_DATE" | cut -d'-' -f2)
        
        echo "${BASE_DIR}/${FRIDAY_YEAR}/${FRIDAY_MONTH}/${FRIDAY_DATE}.md"
        ;;
        
    monthly)
        # 月报: YYYY-MM.md 格式
        echo "${BASE_DIR}/${YEAR}/${MONTH}/${YEAR}-${MONTH}.md"
        ;;
        
    yearly)
        # 年报: 返回两个路径（用换行分隔），输出到年度根目录
        echo "${BASE_DIR}/${YEAR}/${YEAR}-12-31-summary.md"
        echo "${BASE_DIR}/${YEAR}/${YEAR}-12-31-self.md"
        ;;
        
    *)
        echo "错误: period 参数必须是 weekly/monthly/yearly" >&2
        exit 1
        ;;
esac
