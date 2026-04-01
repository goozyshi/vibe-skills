#!/bin/bash
# 扫描指定周期内的所有子报告文件
# 用法: bash scan-period-reports.sh <start_date> <end_date> <base_dir>
# 参数:
#   start_date: YYYY-MM-DD 格式
#   end_date: YYYY-MM-DD 格式
#   base_dir: 报告基准目录路径
# 输出: 文件路径列表（每行一个）

set -euo pipefail

if [ $# -ne 3 ]; then
    echo "用法: $0 <start_date> <end_date> <base_dir>" >&2
    echo "示例: $0 2026-03-01 2026-03-31 ~/mico-work-summary" >&2
    exit 1
fi

START_DATE="$1"
END_DATE="$2"
BASE_DIR="$3"

# 验证日期格式
if ! date -j -f "%Y-%m-%d" "$START_DATE" >/dev/null 2>&1; then
    echo "错误: start_date 格式无效，需要 YYYY-MM-DD 格式" >&2
    exit 1
fi

if ! date -j -f "%Y-%m-%d" "$END_DATE" >/dev/null 2>&1; then
    echo "错误: end_date 格式无效，需要 YYYY-MM-DD 格式" >&2
    exit 1
fi

# 验证目录存在
if [ ! -d "$BASE_DIR" ]; then
    echo "错误: 基准目录不存在: $BASE_DIR" >&2
    exit 1
fi

# 转换日期为时间戳（秒）以便比较
START_TS=$(date -j -f "%Y-%m-%d" "$START_DATE" "+%s")
END_TS=$(date -j -f "%Y-%m-%d" "$END_DATE" "+%s")

# 查找所有 .md 文件并按日期过滤
find "$BASE_DIR" -type f -name "*.md" ! -name ".*" | while read -r file; do
    # 从文件名提取日期
    filename=$(basename "$file")
    file_date=""

    # 尝试匹配月报格式（YYYY-MM.md）
    if [[ "$filename" =~ ^([0-9]{4}-[0-9]{2})\.md$ ]]; then
        # 月报格式：取该月最后一天作为代表日期
        year_month="${BASH_REMATCH[1]}"
        # 获取该月最后一天（简易计算：下个月第一天减一天）
        file_date=$(date -j -v+1m -f "%Y-%m-%d" "${year_month}-01" -v-1d "+%Y-%m-%d")
    # 尝试匹配周报/年报格式（YYYY-MM-DD*.md）
    elif [[ "$filename" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
        file_date="${BASH_REMATCH[1]}"
    fi

    # 如果有提取到日期，验证并检查范围
    if [ -n "$file_date" ]; then
        if date -j -f "%Y-%m-%d" "$file_date" >/dev/null 2>&1; then
            file_ts=$(date -j -f "%Y-%m-%d" "$file_date" "+%s")

            # 检查日期是否在范围内
            if [ "$file_ts" -ge "$START_TS" ] && [ "$file_ts" -le "$END_TS" ]; then
                echo "$file"
            fi
        fi
    fi
done | sort
