import { createCommentVNode, defineComponent, h, ref, Ref, PropType, inject, nextTick, ComputedRef, onBeforeUnmount, onMounted, onUnmounted } from 'vue'
import XEUtils from 'xe-utils'
import GlobalConfig from '../../v-x-e-table/src/conf'
import { VXETable } from '../../v-x-e-table'
import { mergeBodyMethod, getRowid, removeScrollListener, restoreScrollListener, XEBodyScrollElement } from './util'
import { updateCellTitle, getPropClass } from '../../tools/dom'
import { isEnableConf } from '../../tools/utils'

import { VxeTablePrivateMethods, VxeTableConstructor, VxeTableDefines, VxeTableMethods, VxeGlobalRendererHandles, VxeColumnPropTypes, SizeType } from '../../../types/all'

const renderType = 'body'

const lineOffsetSizes = {
  mini: 3,
  small: 2,
  medium: 1
}

export default defineComponent({
  name: 'VxeTableBody',
  props: {
    tableData: Array as PropType<any[]>,
    tableColumn: Array as PropType<VxeTableDefines.ColumnInfo[]>,
    fixedColumn: Array as PropType<VxeTableDefines.ColumnInfo[]>,
    fixedType: { type: String as PropType<VxeColumnPropTypes.Fixed>, default: null }
  },
  setup (props) {
    const $xetable = inject('$xetable', {} as VxeTableConstructor & VxeTableMethods & VxeTablePrivateMethods)

    const xesize = inject('xesize', null as ComputedRef<SizeType> | null)

    const { xID, props: tableProps, context: tableContext, reactData: tableReactData, internalData: tableInternalData } = $xetable
    const { refTableHeader, refTableBody, refTableFooter, refTableLeftBody, refTableRightBody, refValidTooltip } = $xetable.getRefMaps()
    const { computeEditOpts, computeMouseOpts, computeSYOpts, computeEmptyOpts, computeKeyboardOpts, computeTooltipOpts, computeRadioOpts, computeTreeOpts, computeCheckboxOpts, computeValidOpts, computeRowOpts, computeColumnOpts } = $xetable.getComputeMaps()

    const refElem = ref() as Ref<XEBodyScrollElement>
    const refBodyTable = ref() as Ref<HTMLTableElement>
    const refBodyColgroup = ref() as Ref<HTMLTableColElement>
    const refBodyTBody = ref() as Ref<HTMLTableSectionElement>
    const refBodyXSpace = ref() as Ref<HTMLDivElement>
    const refBodyYSpace = ref() as Ref<HTMLDivElement>
    const refBodyEmptyBlock = ref() as Ref<HTMLDivElement>

    const getOffsetSize = () => {
      if (xesize) {
        const vSize = xesize.value
        if (vSize) {
          return lineOffsetSizes[vSize] || 0
        }
      }
      return 0
    }

    const countTreeExpand = (prevRow: any, params: any) => {
      let count = 1
      if (!prevRow) {
        return count
      }
      const treeOpts = computeTreeOpts.value
      const rowChildren = prevRow[treeOpts.children]
      if ($xetable.isTreeExpandByRow(prevRow)) {
        for (let index = 0; index < rowChildren.length; index++) {
          count += countTreeExpand(rowChildren[index], params)
        }
      }
      return count
    }

    const calcTreeLine = (params: any, items: any[], rIndex: number) => {
      let expandSize = 1
      if (rIndex) {
        expandSize = countTreeExpand(items[rIndex - 1], params)
      }
      return tableReactData.rowHeight * expandSize - (rIndex ? 1 : (12 - getOffsetSize()))
    }

    // ???????????????????????????????????????
    const isOperateMouse = () => {
      const { delayHover } = tableProps
      const { lastScrollTime, _isResize } = tableInternalData
      return _isResize || (lastScrollTime && Date.now() < lastScrollTime + (delayHover as number))
    }

    const renderLine = (params: any) => {
      const { row, column } = params
      const { treeConfig } = tableProps
      const treeOpts = computeTreeOpts.value
      const { slots, treeNode } = column
      const { fullAllDataRowIdData } = tableInternalData
      const rowid = getRowid($xetable, row)
      const rest = fullAllDataRowIdData[rowid]
      let rLevel = 0
      let rIndex = 0
      let items = []
      if (rest) {
        rLevel = rest.level
        rIndex = rest._index
        items = rest.items
      }
      if (slots && slots.line) {
        return $xetable.callSlot(slots.line, params)
      }
      if (treeConfig && treeNode && treeOpts.line) {
        return [
          h('div', {
            class: 'vxe-tree--line-wrapper'
          }, [
            h('div', {
              class: 'vxe-tree--line',
              style: {
                height: `${calcTreeLine(params, items, rIndex)}px`,
                left: `${(rLevel * treeOpts.indent) + (rLevel ? 2 - getOffsetSize() : 0) + 16}px`
              }
            })
          ])
        ]
      }
      return []
    }

    /**
     * ?????????
     */
    const renderColumn = (seq: number | string, rowid: string, fixedType: any, rowLevel: number, row: any, rowIndex: number, $rowIndex: number, _rowIndex: number, column: any, $columnIndex: number, columns: any, items: any[]) => {
      const { columnKey, height, showOverflow: allColumnOverflow, cellClassName: allCellClassName, cellStyle, align: allAlign, spanMethod, mouseConfig, editConfig, editRules, tooltipConfig } = tableProps
      const { tableData, overflowX, scrollYLoad, currentColumn, mergeList, editStore, validStore, isAllOverflow } = tableReactData
      const { afterFullData } = tableInternalData
      const validOpts = computeValidOpts.value
      const checkboxOpts = computeCheckboxOpts.value
      const editOpts = computeEditOpts.value
      const tooltipOpts = computeTooltipOpts.value
      const rowOpts = computeRowOpts.value
      const sYOpts = computeSYOpts.value
      const columnOpts = computeColumnOpts.value
      const { type, cellRender, editRender, align, showOverflow, className, treeNode } = column
      const { actived } = editStore
      const { rHeight: scrollYRHeight } = sYOpts
      const { height: rowHeight } = rowOpts
      const renderOpts = editRender || cellRender
      const compConf = renderOpts ? VXETable.renderer.get(renderOpts.name) : null
      const cellClassName = compConf ? compConf.cellClassName : ''
      const showAllTip = tooltipOpts.showAll
      const columnIndex = $xetable.getColumnIndex(column)
      const _columnIndex = $xetable.getVTColumnIndex(column)
      const isEdit = isEnableConf(editRender)
      let fixedHiddenColumn = fixedType ? column.fixed !== fixedType : column.fixed && overflowX
      const cellOverflow = (XEUtils.isUndefined(showOverflow) || XEUtils.isNull(showOverflow)) ? allColumnOverflow : showOverflow
      let showEllipsis = cellOverflow === 'ellipsis'
      const showTitle = cellOverflow === 'title'
      const showTooltip = cellOverflow === true || cellOverflow === 'tooltip'
      let hasEllipsis = showTitle || showTooltip || showEllipsis
      let isDirty
      const tdOns: any = {}
      const cellAlign = align || allAlign
      const hasValidError = validStore.row === row && validStore.column === column
      const showValidTip = editRules && validOpts.showMessage && (validOpts.message === 'default' ? (height || tableData.length > 1) : validOpts.message === 'inline')
      const attrs: any = { colid: column.id }
      const params: VxeTableDefines.CellRenderBodyParams = { $table: $xetable, seq, rowid, row, rowIndex, $rowIndex, _rowIndex, column, columnIndex, $columnIndex, _columnIndex, fixed: fixedType, type: renderType, isHidden: fixedHiddenColumn, level: rowLevel, visibleData: afterFullData, data: tableData, items }
      // ?????????????????????????????????
      if (scrollYLoad && !hasEllipsis) {
        showEllipsis = hasEllipsis = true
      }
      // hover ????????????
      if (showTitle || showTooltip || showAllTip || tooltipConfig) {
        tdOns.onMouseenter = (evnt: MouseEvent) => {
          if (isOperateMouse()) {
            return
          }
          if (showTitle) {
            updateCellTitle(evnt.currentTarget, column)
          } else if (showTooltip || showAllTip) {
            // ????????????????????? tooltip
            $xetable.triggerBodyTooltipEvent(evnt, params)
          }
          $xetable.dispatchEvent('cell-mouseenter', Object.assign({ cell: evnt.currentTarget }, params), evnt)
        }
      }
      // hover ????????????
      if (showTooltip || showAllTip || tooltipConfig) {
        tdOns.onMouseleave = (evnt: MouseEvent) => {
          if (isOperateMouse()) {
            return
          }
          if (showTooltip || showAllTip) {
            $xetable.handleTargetLeaveEvent(evnt)
          }
          $xetable.dispatchEvent('cell-mouseleave', Object.assign({ cell: evnt.currentTarget }, params), evnt)
        }
      }
      // ??????????????????
      if (checkboxOpts.range || mouseConfig) {
        tdOns.onMousedown = (evnt: MouseEvent) => {
          $xetable.triggerCellMousedownEvent(evnt, params)
        }
      }
      // ??????????????????
      tdOns.onClick = (evnt: MouseEvent) => {
        $xetable.triggerCellClickEvent(evnt, params)
      }
      // ??????????????????
      tdOns.onDblclick = (evnt: MouseEvent) => {
        $xetable.triggerCellDblclickEvent(evnt, params)
      }
      // ???????????????
      if (mergeList.length) {
        const spanRest = mergeBodyMethod(mergeList, _rowIndex, _columnIndex)
        if (spanRest) {
          const { rowspan, colspan } = spanRest
          if (!rowspan || !colspan) {
            return null
          }
          if (rowspan > 1) {
            attrs.rowspan = rowspan
          }
          if (colspan > 1) {
            attrs.colspan = colspan
          }
        }
      } else if (spanMethod) {
        // ?????????????????????????????????
        const { rowspan = 1, colspan = 1 } = spanMethod(params) || {}
        if (!rowspan || !colspan) {
          return null
        }
        if (rowspan > 1) {
          attrs.rowspan = rowspan
        }
        if (colspan > 1) {
          attrs.colspan = colspan
        }
      }
      // ???????????????????????????
      if (fixedHiddenColumn && mergeList) {
        if (attrs.colspan > 1 || attrs.rowspan > 1) {
          fixedHiddenColumn = false
        }
      }
      // ?????????????????????????????????
      if (!fixedHiddenColumn && editConfig && (editRender || cellRender) && (editOpts.showStatus || editOpts.showUpdateStatus)) {
        isDirty = $xetable.isUpdateByRow(row, column.field)
      }
      const tdVNs = []
      if (fixedHiddenColumn && (allColumnOverflow ? isAllOverflow : allColumnOverflow)) {
        tdVNs.push(
          h('div', {
            class: ['vxe-cell', {
              'c--title': showTitle,
              'c--tooltip': showTooltip,
              'c--ellipsis': showEllipsis
            }],
            style: {
              maxHeight: hasEllipsis && (scrollYRHeight || rowHeight) ? `${scrollYRHeight || rowHeight}px` : ''
            }
          })
        )
      } else {
        // ???????????????
        tdVNs.push(
          ...renderLine(params),
          h('div', {
            class: ['vxe-cell', {
              'c--title': showTitle,
              'c--tooltip': showTooltip,
              'c--ellipsis': showEllipsis
            }],
            style: {
              maxHeight: hasEllipsis && (scrollYRHeight || rowHeight) ? `${scrollYRHeight || rowHeight}px` : ''
            },
            title: showTitle ? $xetable.getCellLabel(row, column) : null
          }, column.renderCell(params))
        )
        if (showValidTip && hasValidError) {
          tdVNs.push(
            h('div', {
              class: 'vxe-cell--valid',
              style: validStore.rule && validStore.rule.maxWidth ? {
                width: `${validStore.rule.maxWidth}px`
              } : null
            }, [
              h('span', {
                class: 'vxe-cell--valid-msg'
              }, validStore.content)
            ])
          )
        }
      }

      return h('td', {
        class: [
          'vxe-body--column',
          column.id,
          {
            [`col--${cellAlign}`]: cellAlign,
            [`col--${type}`]: type,
            'col--last': $columnIndex === columns.length - 1,
            'col--tree-node': treeNode,
            'col--edit': isEdit,
            'col--ellipsis': hasEllipsis,
            'fixed--hidden': fixedHiddenColumn,
            'col--dirty': isDirty,
            'col--actived': editConfig && isEdit && (actived.row === row && (actived.column === column || editOpts.mode === 'row')),
            'col--valid-error': hasValidError,
            'col--current': currentColumn === column
          },
          getPropClass(cellClassName, params),
          getPropClass(className, params),
          getPropClass(allCellClassName, params)
        ],
        key: columnKey || columnOpts.useKey ? column.id : $columnIndex,
        ...attrs,
        style: Object.assign({
          height: hasEllipsis && (scrollYRHeight || rowHeight) ? `${scrollYRHeight || rowHeight}px` : ''
        }, cellStyle ? (XEUtils.isFunction(cellStyle) ? cellStyle(params) : cellStyle) : null),
        ...tdOns
      }, tdVNs)
    }

    const renderRows = (fixedType: any, tableData: any, tableColumn: any) => {
      const { stripe, rowKey, highlightHoverRow, rowClassName, rowStyle, showOverflow: allColumnOverflow, editConfig, treeConfig } = tableProps
      const { hasFixedColumn, treeExpandeds, scrollYLoad, editStore, rowExpandeds, expandColumn, selectRow } = tableReactData
      const { fullAllDataRowIdData } = tableInternalData
      const checkboxOpts = computeCheckboxOpts.value
      const radioOpts = computeRadioOpts.value
      const treeOpts = computeTreeOpts.value
      const editOpts = computeEditOpts.value
      const rowOpts = computeRowOpts.value
      const { transform } = treeOpts
      const rows: any[] = []
      tableData.forEach((row: any, $rowIndex: any) => {
        const trOn: any = {}
        let rowIndex = $rowIndex
        // ????????????????????? rowIndex ????????????????????? data ??????
        rowIndex = $xetable.getRowIndex(row)
        // ????????????
        if (rowOpts.isHover || highlightHoverRow) {
          trOn.onMouseenter = (evnt: any) => {
            if (isOperateMouse()) {
              return
            }
            $xetable.triggerHoverEvent(evnt, { row, rowIndex })
          }
          trOn.onMouseleave = () => {
            if (isOperateMouse()) {
              return
            }
            $xetable.clearHoverRow()
          }
        }
        const rowid = getRowid($xetable, row)
        const rest = fullAllDataRowIdData[rowid]
        let rowLevel = 0
        let seq: string | number = -1
        let _rowIndex = 0
        if (rest) {
          rowLevel = rest.level
          seq = rest.seq
          _rowIndex = rest._index
        }
        const params = { $table: $xetable, seq, rowid, fixed: fixedType, type: renderType, level: rowLevel, row, rowIndex, $rowIndex, _rowIndex }
        // ??????????????????
        const isExpandRow = expandColumn && rowExpandeds.length && $xetable.findRowIndexOf(rowExpandeds, row) > -1
        // ????????????????????????
        let isExpandTree = false
        let rowChildren = []
        // ??????????????????
        let isNewRow = false
        if (editConfig) {
          isNewRow = $xetable.findRowIndexOf(editStore.insertList, row) > -1
        }
        if (treeConfig && !scrollYLoad && !transform && treeExpandeds.length) {
          rowChildren = row[treeOpts.children]
          isExpandTree = rowChildren && rowChildren.length && $xetable.findRowIndexOf(treeExpandeds, row) > -1
        }
        rows.push(
          h('tr', {
            class: [
              'vxe-body--row',
              treeConfig ? `row--level-${rowLevel}` : '',
              {
                'row--stripe': stripe && ($xetable.getVTRowIndex(row) + 1) % 2 === 0,
                'is--new': isNewRow,
                'is--expand-row': isExpandRow,
                'is--expand-tree': isExpandTree,
                'row--new': isNewRow && (editOpts.showStatus || editOpts.showInsertStatus),
                'row--radio': radioOpts.highlight && selectRow === row,
                'row--checked': checkboxOpts.highlight && $xetable.isCheckedByCheckboxRow(row)
              },
              getPropClass(rowClassName, params)
            ],
            rowid: rowid,
            style: rowStyle ? (XEUtils.isFunction(rowStyle) ? rowStyle(params) : rowStyle) : null,
            key: (rowKey || rowOpts.useKey) || treeConfig ? rowid : $rowIndex,
            ...trOn
          }, tableColumn.map((column: any, $columnIndex: any) => {
            return renderColumn(seq, rowid, fixedType, rowLevel, row, rowIndex, $rowIndex, _rowIndex, column, $columnIndex, tableColumn, tableData)
          }))
        )
        // ?????????????????????
        if (isExpandRow) {
          let cellStyle
          if (treeConfig) {
            cellStyle = {
              paddingLeft: `${(rowLevel * treeOpts.indent) + 30}px`
            }
          }
          const { showOverflow } = expandColumn
          const hasEllipsis = (XEUtils.isUndefined(showOverflow) || XEUtils.isNull(showOverflow)) ? allColumnOverflow : showOverflow
          const expandParams = { $table: $xetable, seq, column: expandColumn, fixed: fixedType, type: renderType, level: rowLevel, row, rowIndex, $rowIndex, _rowIndex }
          rows.push(
            h('tr', {
              class: 'vxe-body--expanded-row',
              key: `expand_${rowid}`,
              style: rowStyle ? (XEUtils.isFunction(rowStyle) ? rowStyle(expandParams) : rowStyle) : null,
              ...trOn
            }, [
              h('td', {
                class: ['vxe-body--expanded-column', {
                  'fixed--hidden': fixedType && !hasFixedColumn,
                  'col--ellipsis': hasEllipsis
                }],
                colspan: tableColumn.length
              }, [
                h('div', {
                  class: 'vxe-body--expanded-cell',
                  style: cellStyle
                }, [
                  expandColumn.renderData(expandParams)
                ])
              ])
            ])
          )
        }
        // ?????????????????????
        if (treeConfig && !scrollYLoad && !transform && treeExpandeds.length) {
          const rowChildren = row[treeOpts.children]
          if (rowChildren && rowChildren.length && $xetable.findRowIndexOf(treeExpandeds, row) > -1) {
            rows.push(...renderRows(fixedType, rowChildren, tableColumn))
          }
        }
      })
      return rows
    }

    /**
     * ???????????????
     */
    let scrollProcessTimeout: any
    const syncBodyScroll = (fixedType: VxeColumnPropTypes.Fixed, scrollTop: number, elem1: XEBodyScrollElement | null, elem2: XEBodyScrollElement | null) => {
      if (elem1 || elem2) {
        if (elem1) {
          removeScrollListener(elem1)
          elem1.scrollTop = scrollTop
        }
        if (elem2) {
          removeScrollListener(elem2)
          elem2.scrollTop = scrollTop
        }
        clearTimeout(scrollProcessTimeout)
        scrollProcessTimeout = setTimeout(() => {
          // const tableBody = refTableBody.value
          // const leftBody = refTableLeftBody.value
          // const rightBody = refTableRightBody.value
          // const bodyElem = tableBody.$el as XEBodyScrollElement
          // const leftElem = leftBody ? leftBody.$el as XEBodyScrollElement : null
          // const rightElem = rightBody ? rightBody.$el as XEBodyScrollElement : null
          restoreScrollListener(elem1)
          restoreScrollListener(elem2)
          // ???????????????????????????
          // let targetTop = bodyElem.scrollTop
          // if (fixedType === 'left') {
          //   if (leftElem) {
          //     targetTop = leftElem.scrollTop
          //   }
          // } else if (fixedType === 'right') {
          //   if (rightElem) {
          //     targetTop = rightElem.scrollTop
          //   }
          // }
          // setScrollTop(bodyElem, targetTop)
          // setScrollTop(leftElem, targetTop)
          // setScrollTop(rightElem, targetTop)
        }, 300)
      }
    }

    /**
     * ????????????
     * ??????????????????????????????????????????????????????
     * ??????????????????????????????????????????????????????
     */
    const scrollEvent = (evnt: Event) => {
      const { fixedType } = props
      const { highlightHoverRow } = tableProps
      const { scrollXLoad, scrollYLoad } = tableReactData
      const { elemStore, lastScrollTop, lastScrollLeft } = tableInternalData
      const rowOpts = computeRowOpts.value
      const tableHeader = refTableHeader.value
      const tableBody = refTableBody.value
      const tableFooter = refTableFooter.value
      const leftBody = refTableLeftBody.value
      const rightBody = refTableRightBody.value
      const validTip = refValidTooltip.value
      const scrollBodyElem = refElem.value
      const headerElem = tableHeader ? tableHeader.$el as HTMLDivElement : null
      const footerElem = tableFooter ? tableFooter.$el as HTMLDivElement : null
      const bodyElem = tableBody.$el as XEBodyScrollElement
      const leftElem = leftBody ? leftBody.$el as XEBodyScrollElement : null
      const rightElem = rightBody ? rightBody.$el as XEBodyScrollElement : null
      const bodyYRef = elemStore['main-body-ySpace']
      const bodyYElem = bodyYRef ? bodyYRef.value : null
      const bodyXRef = elemStore['main-body-xSpace']
      const bodyXElem = bodyXRef ? bodyXRef.value : null
      const bodyHeight = scrollYLoad && bodyYElem ? bodyYElem.clientHeight : bodyElem.clientHeight
      const bodyWidth = scrollXLoad && bodyXElem ? bodyXElem.clientWidth : bodyElem.clientWidth
      let scrollTop = scrollBodyElem.scrollTop
      const scrollLeft = bodyElem.scrollLeft
      const isRollX = scrollLeft !== lastScrollLeft
      const isRollY = scrollTop !== lastScrollTop
      tableInternalData.lastScrollTop = scrollTop
      tableInternalData.lastScrollLeft = scrollLeft
      tableInternalData.lastScrollTime = Date.now()
      if (rowOpts.isHover || highlightHoverRow) {
        $xetable.clearHoverRow()
      }
      if (leftElem && fixedType === 'left') {
        scrollTop = leftElem.scrollTop
        syncBodyScroll(fixedType, scrollTop, bodyElem, rightElem)
      } else if (rightElem && fixedType === 'right') {
        scrollTop = rightElem.scrollTop
        syncBodyScroll(fixedType, scrollTop, bodyElem, leftElem)
      } else {
        if (isRollX) {
          if (headerElem) {
            headerElem.scrollLeft = bodyElem.scrollLeft
          }
          if (footerElem) {
            footerElem.scrollLeft = bodyElem.scrollLeft
          }
        }
        if (leftElem || rightElem) {
          $xetable.checkScrolling()
          if (isRollY) {
            syncBodyScroll(fixedType, scrollTop, leftElem, rightElem)
          }
        }
      }
      if (scrollXLoad && isRollX) {
        $xetable.triggerScrollXEvent(evnt)
      }
      if (scrollYLoad && isRollY) {
        $xetable.triggerScrollYEvent(evnt)
      }
      if (isRollX && validTip && validTip.reactData.visible) {
        validTip.updatePlacement()
      }
      $xetable.dispatchEvent('scroll', {
        type: renderType,
        fixed: fixedType,
        scrollTop,
        scrollLeft,
        scrollHeight: bodyElem.scrollHeight,
        scrollWidth: bodyElem.scrollWidth,
        bodyHeight,
        bodyWidth,
        isX: isRollX,
        isY: isRollY
      }, evnt)
    }

    let wheelTime: any
    let wheelYSize = 0
    let wheelYInterval = 0
    let wheelYTotal = 0
    let isPrevWheelTop = false

    const handleWheel = (evnt: WheelEvent, isTopWheel: boolean, deltaTop: number, isRollX: boolean, isRollY: boolean) => {
      const { elemStore } = tableInternalData
      const { scrollXLoad, scrollYLoad } = tableReactData
      const tableBody = refTableBody.value
      const leftBody = refTableLeftBody.value
      const rightBody = refTableRightBody.value
      const leftElem = leftBody ? leftBody.$el as HTMLDivElement : null
      const rightElem = rightBody ? rightBody.$el as HTMLDivElement : null
      const bodyElem = tableBody.$el as HTMLDivElement
      const bodyYRef = elemStore['main-body-ySpace']
      const bodyYElem = bodyYRef ? bodyYRef.value : null
      const bodyXRef = elemStore['main-body-xSpace']
      const bodyXElem = bodyXRef ? bodyXRef.value : null
      const bodyHeight = scrollYLoad && bodyYElem ? bodyYElem.clientHeight : bodyElem.clientHeight
      const bodyWidth = scrollXLoad && bodyXElem ? bodyXElem.clientWidth : bodyElem.clientWidth
      const remainSize = isPrevWheelTop === isTopWheel ? Math.max(0, wheelYSize - wheelYTotal) : 0
      isPrevWheelTop = isTopWheel
      wheelYSize = Math.abs(isTopWheel ? deltaTop - remainSize : deltaTop + remainSize)
      wheelYInterval = 0
      wheelYTotal = 0
      clearTimeout(wheelTime)
      const handleSmooth = () => {
        if (wheelYTotal < wheelYSize) {
          const { fixedType } = props
          wheelYInterval = Math.max(5, Math.floor(wheelYInterval * 1.5))
          wheelYTotal = wheelYTotal + wheelYInterval
          if (wheelYTotal > wheelYSize) {
            wheelYInterval = wheelYInterval - (wheelYTotal - wheelYSize)
          }
          const { scrollTop, clientHeight, scrollHeight } = bodyElem
          const targerTop = scrollTop + (wheelYInterval * (isTopWheel ? -1 : 1))
          bodyElem.scrollTop = targerTop
          if (leftElem) {
            leftElem.scrollTop = targerTop
          }
          if (rightElem) {
            rightElem.scrollTop = targerTop
          }
          if (isTopWheel ? targerTop < scrollHeight - clientHeight : targerTop >= 0) {
            wheelTime = setTimeout(handleSmooth, 10)
          }
          $xetable.dispatchEvent('scroll', {
            type: renderType,
            fixed: fixedType,
            scrollTop: bodyElem.scrollTop,
            scrollLeft: bodyElem.scrollLeft,
            scrollHeight: bodyElem.scrollHeight,
            scrollWidth: bodyElem.scrollWidth,
            bodyHeight,
            bodyWidth,
            isX: isRollX,
            isY: isRollY
          }, evnt)
        }
      }
      handleSmooth()
    }

    /**
     * ????????????
     */
    const wheelEvent = (evnt: WheelEvent) => {
      const { deltaY, deltaX } = evnt
      const { highlightHoverRow } = tableProps
      const { scrollYLoad } = tableReactData
      const { lastScrollTop, lastScrollLeft } = tableInternalData
      const rowOpts = computeRowOpts.value
      const tableBody = refTableBody.value
      const scrollBodyElem = refElem.value
      const bodyElem = tableBody.$el as HTMLDivElement

      const deltaTop = deltaY
      const deltaLeft = deltaX
      const isTopWheel = deltaTop < 0
      // ???????????????????????????????????????????????????????????????
      if (isTopWheel ? scrollBodyElem.scrollTop <= 0 : scrollBodyElem.scrollTop >= scrollBodyElem.scrollHeight - scrollBodyElem.clientHeight) {
        return
      }

      const scrollTop = scrollBodyElem.scrollTop + deltaTop
      const scrollLeft = bodyElem.scrollLeft + deltaLeft
      const isRollX = scrollLeft !== lastScrollLeft
      const isRollY = scrollTop !== lastScrollTop

      // ??????????????????????????????
      if (isRollY) {
        evnt.preventDefault()
        tableInternalData.lastScrollTop = scrollTop
        tableInternalData.lastScrollLeft = scrollLeft
        tableInternalData.lastScrollTime = Date.now()
        if (rowOpts.isHover || highlightHoverRow) {
          $xetable.clearHoverRow()
        }
        handleWheel(evnt, isTopWheel, deltaTop, isRollX, isRollY)
        if (scrollYLoad) {
          $xetable.triggerScrollYEvent(evnt)
        }
      }
    }

    onMounted(() => {
      nextTick(() => {
        const { fixedType } = props
        const { elemStore } = tableInternalData
        const prefix = `${fixedType || 'main'}-body-`
        const el = refElem.value
        elemStore[`${prefix}wrapper`] = refElem
        elemStore[`${prefix}table`] = refBodyTable
        elemStore[`${prefix}colgroup`] = refBodyColgroup
        elemStore[`${prefix}list`] = refBodyTBody
        elemStore[`${prefix}xSpace`] = refBodyXSpace
        elemStore[`${prefix}ySpace`] = refBodyYSpace
        elemStore[`${prefix}emptyBlock`] = refBodyEmptyBlock
        el.onscroll = scrollEvent
        el._onscroll = scrollEvent
      })
    })

    onBeforeUnmount(() => {
      const el = refElem.value
      clearTimeout(wheelTime)
      el._onscroll = null
      el.onscroll = null
    })

    onUnmounted(() => {
      const { fixedType } = props
      const { elemStore } = tableInternalData
      const prefix = `${fixedType || 'main'}-body-`
      elemStore[`${prefix}wrapper`] = null
      elemStore[`${prefix}table`] = null
      elemStore[`${prefix}colgroup`] = null
      elemStore[`${prefix}list`] = null
      elemStore[`${prefix}xSpace`] = null
      elemStore[`${prefix}ySpace`] = null
      elemStore[`${prefix}emptyBlock`] = null
    })

    const renderVN = () => {
      let { fixedColumn, fixedType, tableColumn } = props
      const { keyboardConfig, showOverflow: allColumnOverflow, spanMethod, mouseConfig } = tableProps
      const { tableData, mergeList, scrollYLoad, isAllOverflow } = tableReactData
      const { visibleColumn } = tableInternalData
      const { slots } = tableContext
      const sYOpts = computeSYOpts.value
      const emptyOpts = computeEmptyOpts.value
      const keyboardOpts = computeKeyboardOpts.value
      const mouseOpts = computeMouseOpts.value
      // const isMergeLeftFixedExceeded = computeIsMergeLeftFixedExceeded.value
      // const isMergeRightFixedExceeded = computeIsMergeRightFixedExceeded.value
      // ???????????????????????????
      if (fixedType) {
        if (scrollYLoad || (allColumnOverflow ? isAllOverflow : allColumnOverflow)) {
          if (!mergeList.length && !spanMethod && !(keyboardConfig && keyboardOpts.isMerge)) {
            tableColumn = fixedColumn
          } else {
            tableColumn = visibleColumn
            // ??????????????????????????????????????????????????????????????????
            // if (mergeList.length && !isMergeLeftFixedExceeded && fixedType === 'left') {
            //   tableColumn = fixedColumn
            // } else if (mergeList.length && !isMergeRightFixedExceeded && fixedType === 'right') {
            //   tableColumn = fixedColumn
            // } else {
            //   tableColumn = visibleColumn
            // }
          }
        } else {
          tableColumn = visibleColumn
        }
      }
      let emptyContent: string | VxeGlobalRendererHandles.RenderResult
      if (slots.empty) {
        emptyContent = $xetable.callSlot(slots.empty, { $table: $xetable })
      } else {
        const compConf = emptyOpts.name ? VXETable.renderer.get(emptyOpts.name) : null
        const renderEmpty = compConf ? compConf.renderEmpty : null
        if (renderEmpty) {
          emptyContent = renderEmpty(emptyOpts, { $table: $xetable })
        } else {
          emptyContent = tableProps.emptyText || GlobalConfig.i18n('vxe.table.emptyText')
        }
      }
      return h('div', {
        ref: refElem,
        class: ['vxe-table--body-wrapper', fixedType ? `fixed-${fixedType}--wrapper` : 'body--wrapper'],
        xid: xID,
        ...(sYOpts.mode === 'wheel' ? { onWheel: wheelEvent } : {})
      }, [
        fixedType ? createCommentVNode() : h('div', {
          ref: refBodyXSpace,
          class: 'vxe-body--x-space'
        }),
        h('div', {
          ref: refBodyYSpace,
          class: 'vxe-body--y-space'
        }),
        h('table', {
          ref: refBodyTable,
          class: 'vxe-table--body',
          xid: xID,
          cellspacing: 0,
          cellpadding: 0,
          border: 0
        }, [
          /**
           * ??????
           */
          h('colgroup', {
            ref: refBodyColgroup
          }, (tableColumn as any[]).map((column, $columnIndex) => {
            return h('col', {
              name: column.id,
              key: $columnIndex
            })
          })),
          /**
           * ??????
           */
          h('tbody', {
            ref: refBodyTBody
          }, renderRows(fixedType, tableData, tableColumn))
        ]),
        h('div', {
          class: 'vxe-table--checkbox-range'
        }),
        mouseConfig && mouseOpts.area ? h('div', {
          class: 'vxe-table--cell-area'
        }, [
          h('span', {
            class: 'vxe-table--cell-main-area'
          }, mouseOpts.extension ? [
            h('span', {
              class: 'vxe-table--cell-main-area-btn',
              onMousedown (evnt: any) {
                $xetable.triggerCellExtendMousedownEvent(evnt, { $table: $xetable, fixed: fixedType, type: renderType })
              }
            })
          ] : []),
          h('span', {
            class: 'vxe-table--cell-copy-area'
          }),
          h('span', {
            class: 'vxe-table--cell-extend-area'
          }),
          h('span', {
            class: 'vxe-table--cell-multi-area'
          }),
          h('span', {
            class: 'vxe-table--cell-active-area'
          })
        ]) : null,
        !fixedType ? h('div', {
          class: 'vxe-table--empty-block',
          ref: refBodyEmptyBlock
        }, [
          h('div', {
            class: 'vxe-table--empty-content'
          }, emptyContent)
        ]) : null
      ])
    }

    return renderVN
  }
})
