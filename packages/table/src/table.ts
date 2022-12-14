import { defineComponent, getCurrentInstance, h, createCommentVNode, ComponentPublicInstance, resolveComponent, ComponentOptions, reactive, ref, Ref, provide, inject, nextTick, onActivated, onDeactivated, onBeforeUnmount, onUnmounted, watch, computed, ComputedRef, onMounted } from 'vue'
import XEUtils from 'xe-utils'
import { browse, isPx, isScale, hasClass, addClass, removeClass, getEventTargetNode, getPaddingTopBottomSize, setScrollTop, setScrollLeft, isNodeElement } from '../../tools/dom'
import { getLastZIndex, nextZIndex, hasChildrenList, getFuncText, isEnableConf, formatText, eqEmptyValue } from '../../tools/utils'
import { warnLog, errLog } from '../../tools/log'
import { createResizeEvent, XEResizeObserver } from '../../tools/resize'
import { GlobalEvent, hasEventKey, EVENT_KEYS } from '../../tools/event'
import { useSize } from '../../hooks/size'
import { VXETable } from '../../v-x-e-table'
import GlobalConfig from '../../v-x-e-table/src/conf'
import Cell from './cell'
import TableBodyComponent from './body'
import TableHeaderComponent from '../../header'
import TableFooterComponent from '../../footer'
import tableProps from './props'
import tableEmits from './emits'
import VxeLoading from '../../loading/index'
import { getRowUniqueId, clearTableAllStatus, getRowkey, getRowid, rowToVisible, colToVisible, getCellValue, setCellValue, handleFieldOrColumn, toTreePathSeq, restoreScrollLocation, restoreScrollListener, XEBodyScrollElement } from './util'
import { getSlotVNs } from '../../tools/vn'

import { VxeGridConstructor, VxeGridPrivateMethods, VxeTableConstructor, TableReactData, TableInternalData, VxeTablePropTypes, VxeToolbarConstructor, VxeTooltipInstance, TablePrivateMethods, VxeTablePrivateRef, VxeTablePrivateComputed, VxeTablePrivateMethods, VxeTableMethods, TableMethods, VxeMenuPanelInstance, VxeTableDefines, VxeTableProps } from '../../../types/all'

const isWebkit = browse['-webkit'] && !browse.edge

const resizableStorageKey = 'VXE_TABLE_CUSTOM_COLUMN_WIDTH'
const visibleStorageKey = 'VXE_TABLE_CUSTOM_COLUMN_VISIBLE'

export default defineComponent({
  name: 'VxeTable',
  props: tableProps,
  emits: tableEmits,
  setup (props, context) {
    const { slots, emit } = context

    const hasUseTooltip = VXETable.tooltip

    const xID = XEUtils.uniqueId()

    const computeSize = useSize(props)

    const instance = getCurrentInstance()

    const reactData = reactive<TableReactData>({
      // ?????????????????????
      staticColumns: [],
      // ??????????????????
      tableGroupColumn: [],
      // ?????????????????????
      tableColumn: [],
      // ??????????????????
      tableData: [],
      // ????????????????????? X ????????????????????????
      scrollXLoad: false,
      // ????????????????????? Y ????????????????????????
      scrollYLoad: false,
      // ???????????????????????????
      overflowY: true,
      // ???????????????????????????
      overflowX: false,
      // ????????????????????????
      scrollbarWidth: 0,
      // ????????????????????????
      scrollbarHeight: 0,
      // ??????
      rowHeight: 0,
      // ????????????????????????
      parentHeight: 0,
      // ????????????????????????
      isGroup: false,
      useCustomHeaderRowSpan: false,
      isAllOverflow: false,
      // ??????????????????????????????
      isAllSelected: false,
      // ?????????????????????????????????????????????
      isIndeterminate: false,
      // ?????????????????????????????????
      selection: [],
      // ?????????
      currentRow: null,
      // ???????????????????????????
      currentColumn: null,
      // ???????????????????????????
      selectRow: null,
      // ??????????????????
      footerTableData: [],
      // ???????????????
      expandColumn: null,
      // ??????????????????
      treeNodeColumn: null,
      hasFixedColumn: false,
      // ???????????????
      rowExpandeds: [],
      // ?????????????????????????????????
      expandLazyLoadeds: [],
      // ??????????????????
      treeExpandeds: [],
      // ?????????????????????????????????
      treeLazyLoadeds: [],
      // ?????????????????????????????????
      treeIndeterminates: [],
      // ???????????????????????????
      mergeList: [],
      // ??????????????????????????????
      mergeFooterList: [],
      // ???????????????
      initStore: {
        filter: false,
        import: false,
        export: false
      },
      // ????????????????????????
      filterStore: {
        isAllSelected: false,
        isIndeterminate: false,
        style: null,
        options: [],
        column: null,
        multiple: false,
        visible: false,
        maxHeight: null
      },
      // ????????????????????????
      columnStore: {
        leftList: [],
        centerList: [],
        rightList: [],
        resizeList: [],
        pxList: [],
        pxMinList: [],
        scaleList: [],
        scaleMinList: [],
        autoList: []
      },
      // ???????????????????????????
      ctxMenuStore: {
        selected: null,
        visible: false,
        showChild: false,
        selectChild: null,
        list: [],
        style: null
      },
      // ???????????????????????????
      editStore: {
        indexs: {
          columns: []
        },
        titles: {
          columns: []
        },
        // ?????????
        selected: {
          row: null,
          column: null
        },
        // ????????????
        copyed: {
          cut: false,
          rows: [],
          columns: []
        },
        // ??????
        actived: {
          row: null,
          column: null
        },
        insertList: [],
        removeList: []
      },
      // ?????? tooltip ????????????
      tooltipStore: {
        row: null,
        column: null,
        content: null,
        visible: false,
        currOpts: null
      },
      // ??????????????????????????????
      validStore: {
        visible: false,
        row: null,
        column: null,
        content: '',
        rule: null,
        isArrow: false
      },
      // ??????????????????
      importStore: {
        inited: false,
        file: null,
        type: '',
        modeList: [],
        typeList: [],
        filename: '',
        visible: false
      },
      importParams: {
        mode: '',
        types: null,
        message: true
      },
      // ??????????????????
      exportStore: {
        inited: false,
        name: '',
        modeList: [],
        typeList: [],
        columns: [],
        isPrint: false,
        hasFooter: false,
        hasMerge: false,
        hasTree: false,
        hasColgroup: false,
        visible: false
      },
      exportParams: {
        filename: '',
        sheetName: '',
        mode: '',
        type: '',
        isColgroup: false,
        isMerge: false,
        isAllExpand: false,
        useStyle: false,
        original: false,
        message: true,
        isHeader: false,
        isFooter: false
      }
    })

    const internalData: TableInternalData = {
      tZindex: 0,
      elemStore: {},
      // ???????????? X ???????????????????????????
      scrollXStore: {
        offsetSize: 0,
        visibleSize: 0,
        startIndex: 0,
        endIndex: 0
      },
      // ???????????? Y ????????????????????????
      scrollYStore: {
        rowHeight: 0,
        offsetSize: 0,
        visibleSize: 0,
        startIndex: 0,
        endIndex: 0
      },
      // ????????????
      tableWidth: 0,
      // ????????????
      tableHeight: 0,
      // ????????????
      headerHeight: 0,
      // ????????????
      footerHeight: 0,
      customHeight: 0,
      customMaxHeight: 0,
      // ?????? hover ???
      hoverRow: null,
      // ??????????????????
      lastScrollLeft: 0,
      lastScrollTop: 0,
      lastScrollTime: 0,
      // ???????????????????????????????????????
      radioReserveRow: null,
      // ???????????????????????????????????????
      checkboxReserveRowMap: {},
      // ?????????????????????????????????
      rowExpandedReserveRowMap: {},
      // ???????????????????????????????????????
      treeExpandedReserveRowMap: {},
      // ????????????????????????????????????
      tableFullData: [],
      afterFullData: [],
      // ???????????????????????????????????????
      tableFullTreeData: [],
      afterTreeFullData: [],
      tableSynchData: [],
      tableSourceData: [],
      // ?????????????????????????????????
      collectColumn: [],
      // ?????????????????????????????????
      tableFullColumn: [],
      // ???????????????
      visibleColumn: [],
      // ?????????????????????
      fullAllDataRowIdData: {},
      // ?????????????????????
      fullDataRowIdData: {},
      fullColumnIdData: {},
      fullColumnFieldData: {},
      inited: false,
      tooltipTimeout: null,
      initStatus: false,
      isActivated: false
    }

    let tableMethods = {} as TableMethods
    let tablePrivateMethods = {} as TablePrivateMethods

    const refElem = ref() as Ref<HTMLDivElement>
    const refTooltip = ref() as Ref<VxeTooltipInstance>
    const refCommTooltip = ref() as Ref<VxeTooltipInstance>
    const refValidTooltip = ref() as Ref<VxeTooltipInstance>
    const refTableFilter = ref() as Ref<ComponentPublicInstance>
    const refTableMenu = ref() as Ref<VxeMenuPanelInstance>

    const refTableHeader = ref() as Ref<ComponentPublicInstance>
    const refTableBody = ref() as Ref<ComponentPublicInstance>
    const refTableFooter = ref() as Ref<ComponentPublicInstance>
    const refTableLeftHeader = ref() as Ref<ComponentPublicInstance>
    const refTableLeftBody = ref() as Ref<ComponentPublicInstance>
    const refTableLeftFooter = ref() as Ref<ComponentPublicInstance>
    const refTableRightHeader = ref() as Ref<ComponentPublicInstance>
    const refTableRightBody = ref() as Ref<ComponentPublicInstance>
    const refTableRightFooter = ref() as Ref<ComponentPublicInstance>

    const refLeftContainer = ref() as Ref<HTMLDivElement>
    const refRightContainer = ref() as Ref<HTMLDivElement>
    const refCellResizeBar = ref() as Ref<HTMLDivElement>
    const refEmptyPlaceholder = ref() as Ref<HTMLDivElement>

    const $xegrid = inject('$xegrid', null as (VxeGridConstructor & VxeGridPrivateMethods) | null)
    let $xetoolbar: VxeToolbarConstructor

    const computeValidOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.validConfig, props.validConfig) as VxeTablePropTypes.ValidOpts
    })

    const computeSXOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.scrollX, props.scrollX) as VxeTablePropTypes.SXOpts
    })

    const computeSYOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.scrollY, props.scrollY) as VxeTablePropTypes.SYOpts
    })

    const computeRowHeightMaps = computed(() => {
      return {
        default: 48,
        medium: 44,
        small: 40,
        mini: 36
      }
    })

    const computeColumnOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.columnConfig, props.columnConfig) as VxeTablePropTypes.ColumnOpts
    })

    const computeRowOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.rowConfig, props.rowConfig) as VxeTablePropTypes.RowOpts
    })

    const computeResizableOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.resizableConfig, props.resizableConfig) as VxeTablePropTypes.ResizableOpts
    })

    const computeSeqOpts = computed(() => {
      return Object.assign({ startIndex: 0 }, GlobalConfig.table.seqConfig, props.seqConfig) as VxeTablePropTypes.SeqOpts
    })

    const computeRadioOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.radioConfig, props.radioConfig) as VxeTablePropTypes.RadioOpts
    })

    const computeCheckboxOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.checkboxConfig, props.checkboxConfig) as VxeTablePropTypes.CheckboxOpts
    })

    let computeTooltipOpts = ref() as ComputedRef<VxeTablePropTypes.TooltipOpts>

    computeTooltipOpts = computed(() => {
      return Object.assign({}, GlobalConfig.tooltip, GlobalConfig.table.tooltipConfig, props.tooltipConfig)
    })

    const computeTipConfig = computed(() => {
      const { tooltipStore } = reactData
      const tooltipOpts = computeTooltipOpts.value
      return {
        ...tooltipOpts,
        ...tooltipStore.currOpts
      }
    })

    const computeValidTipOpts = computed(() => {
      const tooltipOpts = computeTooltipOpts.value
      return Object.assign({ isArrow: false }, tooltipOpts)
    })

    const computeEditOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.editConfig, props.editConfig) as VxeTablePropTypes.EditOpts
    })

    const computeSortOpts = computed(() => {
      return Object.assign({ orders: ['asc', 'desc', null] }, GlobalConfig.table.sortConfig, props.sortConfig) as VxeTablePropTypes.SortOpts
    })

    const computeFilterOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.filterConfig, props.filterConfig) as VxeTablePropTypes.FilterOpts
    })

    const computeMouseOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.mouseConfig, props.mouseConfig) as VxeTablePropTypes.MouseOpts
    })

    const computeAreaOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.areaConfig, props.areaConfig) as VxeTablePropTypes.AreaOpts
    })

    const computeKeyboardOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.keyboardConfig, props.keyboardConfig) as VxeTablePropTypes.KeyboardOpts
    })

    const computeClipOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.clipConfig, props.clipConfig) as VxeTablePropTypes.ClipOpts
    })

    const computeFNROpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.fnrConfig, props.fnrConfig) as VxeTablePropTypes.FNROpts
    })

    const computeMenuOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.menuConfig, props.menuConfig)
    })

    const computeHeaderMenu = computed(() => {
      const menuOpts = computeMenuOpts.value
      const headerOpts = menuOpts.header
      return headerOpts && headerOpts.options ? headerOpts.options : []
    })

    const computeBodyMenu = computed(() => {
      const menuOpts = computeMenuOpts.value
      const bodyOpts = menuOpts.body
      return bodyOpts && bodyOpts.options ? bodyOpts.options : []
    })

    const computeFooterMenu = computed(() => {
      const menuOpts = computeMenuOpts.value
      const footerOpts = menuOpts.footer
      return footerOpts && footerOpts.options ? footerOpts.options : []
    })

    const computeIsMenu = computed(() => {
      const menuOpts = computeMenuOpts.value
      const headerMenu = computeHeaderMenu.value
      const bodyMenu = computeBodyMenu.value
      const footerMenu = computeFooterMenu.value
      return !!(props.menuConfig && isEnableConf(menuOpts) && (headerMenu.length || bodyMenu.length || footerMenu.length))
    })

    const computeMenuList = computed(() => {
      const { ctxMenuStore } = reactData
      const rest: any[] = []
      ctxMenuStore.list.forEach((list) => {
        list.forEach((item) => {
          rest.push(item)
        })
      })
      return rest
    })

    const computeExportOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.exportConfig, props.exportConfig) as VxeTablePropTypes.ExportOpts
    })

    const computeImportOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.importConfig, props.importConfig) as VxeTablePropTypes.ImportOpts
    })

    const computePrintOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.printConfig, props.printConfig) as VxeTablePropTypes.PrintOpts
    })

    const computeExpandOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.expandConfig, props.expandConfig) as VxeTablePropTypes.ExpandOpts
    })

    const computeTreeOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.treeConfig, props.treeConfig) as VxeTablePropTypes.TreeOpts
    })

    const computeEmptyOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.emptyRender, props.emptyRender) as VxeTablePropTypes.EmptyOpts
    })

    const computeCellOffsetWidth = computed(() => {
      return props.border ? Math.max(2, Math.ceil(reactData.scrollbarWidth / reactData.tableColumn.length)) : 1
    })

    const computeCustomOpts = computed(() => {
      return Object.assign({}, GlobalConfig.table.customConfig, props.customConfig)
    })

    const computeTableBorder = computed(() => {
      const { border } = props
      if (border === true) {
        return 'full'
      }
      if (border) {
        return border
      }
      return 'default'
    })

    const computeIsAllCheckboxDisabled = computed(() => {
      const { treeConfig } = props
      const { tableData } = reactData
      const { tableFullData } = internalData
      const checkboxOpts = computeCheckboxOpts.value
      const { strict, checkMethod } = checkboxOpts
      if (strict) {
        if (tableData.length || tableFullData.length) {
          if (checkMethod) {
            if (treeConfig) {
              // ???????????????????????????
            }
            // ???????????????????????????
            return tableFullData.every((row) => !checkMethod({ row }))
          }
          return false
        }
        return true
      }
      return false
    })

    const refMaps: VxeTablePrivateRef = {
      refElem,
      refTooltip,
      refValidTooltip,
      refTableFilter,
      refTableMenu,
      refTableHeader,
      refTableBody,
      refTableFooter,
      refTableLeftHeader,
      refTableLeftBody,
      refTableLeftFooter,
      refTableRightHeader,
      refTableRightBody,
      refTableRightFooter,
      refLeftContainer,
      refRightContainer,
      refCellResizeBar
    }

    const computeMaps: VxeTablePrivateComputed = {
      computeSize,
      computeValidOpts,
      computeSXOpts,
      computeSYOpts,
      computeColumnOpts,
      computeRowOpts,
      computeResizableOpts,
      computeSeqOpts,
      computeRadioOpts,
      computeCheckboxOpts,
      computeTooltipOpts,
      computeEditOpts,
      computeSortOpts,
      computeFilterOpts,
      computeMouseOpts,
      computeAreaOpts,
      computeKeyboardOpts,
      computeClipOpts,
      computeFNROpts,
      computeHeaderMenu,
      computeBodyMenu,
      computeFooterMenu,
      computeIsMenu,
      computeMenuOpts,
      computeExportOpts,
      computeImportOpts,
      computePrintOpts,
      computeExpandOpts,
      computeTreeOpts,
      computeEmptyOpts,
      computeCustomOpts,
      computeIsAllCheckboxDisabled
    }

    const $xetable = {
      xID,
      props: props as VxeTableProps,
      context,
      instance,
      reactData,
      internalData,
      getRefMaps: () => refMaps,
      getComputeMaps: () => computeMaps,

      xegrid: $xegrid
    } as unknown as VxeTableConstructor & VxeTableMethods & VxeTablePrivateMethods

    const eqCellValue = (row1: any, row2: any, field: string) => {
      const val1 = XEUtils.get(row1, field)
      const val2 = XEUtils.get(row2, field)
      if (eqEmptyValue(val1) && eqEmptyValue(val2)) {
        return true
      }
      if (XEUtils.isString(val1) || XEUtils.isNumber(val1)) {
        return ('' + val1) === ('' + val2)
      }
      return XEUtils.isEqual(val1, val2)
    }

    const getNextSortOrder = (column: VxeTableDefines.ColumnInfo) => {
      const sortOpts = computeSortOpts.value
      const { orders } = sortOpts
      const currOrder = column.order || null
      const oIndex = orders.indexOf(currOrder) + 1
      return orders[oIndex < orders.length ? oIndex : 0]
    }

    const getCustomStorageMap = (key: string) => {
      const version = GlobalConfig.version
      const rest = XEUtils.toStringJSON(localStorage.getItem(key) || '')
      return rest && rest._v === version ? rest : { _v: version }
    }

    const getRecoverRow = (list: any[]) => {
      const { fullAllDataRowIdData } = internalData
      return list.filter((row) => {
        const rowid = getRowid($xetable, row)
        return !!fullAllDataRowIdData[rowid]
      })
    }

    const handleReserveRow = (reserveRowMap: any) => {
      const { fullDataRowIdData } = internalData
      const reserveList: any[] = []
      XEUtils.each(reserveRowMap, (item, rowid) => {
        if (fullDataRowIdData[rowid] && $xetable.findRowIndexOf(reserveList, fullDataRowIdData[rowid].row) === -1) {
          reserveList.push(fullDataRowIdData[rowid].row)
        }
      })
      return reserveList
    }

    const computeVirtualX = () => {
      const { visibleColumn } = internalData
      const tableBody = refTableBody.value
      const tableBodyElem = tableBody ? tableBody.$el as HTMLDivElement : null
      if (tableBodyElem) {
        const { scrollLeft, clientWidth } = tableBodyElem
        const endWidth = scrollLeft + clientWidth
        let toVisibleIndex = -1
        let cWidth = 0
        let visibleSize = 0
        for (let colIndex = 0, colLen = visibleColumn.length; colIndex < colLen; colIndex++) {
          cWidth += visibleColumn[colIndex].renderWidth
          if (toVisibleIndex === -1 && scrollLeft < cWidth) {
            toVisibleIndex = colIndex
          }
          if (toVisibleIndex >= 0) {
            visibleSize++
            if (cWidth > endWidth) {
              break
            }
          }
        }
        return { toVisibleIndex: Math.max(0, toVisibleIndex), visibleSize: Math.max(8, visibleSize) }
      }
      return { toVisibleIndex: 0, visibleSize: 8 }
    }

    const computeVirtualY = () => {
      const tableHeader = refTableHeader.value
      const tableBody = refTableBody.value
      const tableBodyElem = tableBody ? tableBody.$el as HTMLDivElement : null
      const vSize = computeSize.value
      const rowHeightMaps = computeRowHeightMaps.value
      if (tableBodyElem) {
        const tableHeaderElem = tableHeader ? tableHeader.$el as HTMLDivElement : null
        let rowHeight = 0
        let firstTrElem
        firstTrElem = tableBodyElem.querySelector('tr')
        if (!firstTrElem && tableHeaderElem) {
          firstTrElem = tableHeaderElem.querySelector('tr')
        }
        if (firstTrElem) {
          rowHeight = firstTrElem.clientHeight
        }
        if (!rowHeight) {
          rowHeight = rowHeightMaps[vSize || 'default']
        }
        const visibleSize = Math.max(8, Math.ceil(tableBodyElem.clientHeight / rowHeight) + 2)
        return { rowHeight, visibleSize }
      }
      return { rowHeight: 0, visibleSize: 8 }
    }

    const calculateMergerOffserIndex = (list: any, offsetItem: any, type: 'row' | 'col') => {
      for (let mcIndex = 0, len = list.length; mcIndex < len; mcIndex++) {
        const mergeItem = list[mcIndex]
        const { startIndex, endIndex } = offsetItem
        const mergeStartIndex = mergeItem[type]
        const mergeSpanNumber = mergeItem[type + 'span']
        const mergeEndIndex = mergeStartIndex + mergeSpanNumber
        if (mergeStartIndex < startIndex && startIndex < mergeEndIndex) {
          offsetItem.startIndex = mergeStartIndex
        }
        if (mergeStartIndex < endIndex && endIndex < mergeEndIndex) {
          offsetItem.endIndex = mergeEndIndex
        }
        if (offsetItem.startIndex !== startIndex || offsetItem.endIndex !== endIndex) {
          mcIndex = -1
        }
      }
    }

    const setMerges = (merges: VxeTableDefines.MergeOptions | VxeTableDefines.MergeOptions[], mList: VxeTableDefines.MergeItem[], rowList?: any[]) => {
      if (merges) {
        const { treeConfig } = props
        const { visibleColumn } = internalData
        if (!XEUtils.isArray(merges)) {
          merges = [merges]
        }
        if (treeConfig && merges.length) {
          errLog('vxe.error.noTree', ['merge-cells | merge-footer-items'])
        }
        merges.forEach((item: any) => {
          let { row, col, rowspan, colspan }: any = item
          if (rowList && XEUtils.isNumber(row)) {
            row = rowList[row]
          }
          if (XEUtils.isNumber(col)) {
            col = visibleColumn[col]
          }
          if ((rowList ? row : XEUtils.isNumber(row)) && col && (rowspan || colspan)) {
            rowspan = XEUtils.toNumber(rowspan) || 1
            colspan = XEUtils.toNumber(colspan) || 1
            if (rowspan > 1 || colspan > 1) {
              const mcIndex = XEUtils.findIndexOf(mList, item => (item._row === row || getRowid($xetable, item._row) === getRowid($xetable, row)) && (item._col.id === col || item._col.id === col.id))
              const mergeItem = mList[mcIndex]
              if (mergeItem) {
                mergeItem.rowspan = rowspan
                mergeItem.colspan = colspan
                mergeItem._rowspan = rowspan
                mergeItem._colspan = colspan
              } else {
                const mergeRowIndex = rowList ? $xetable.findRowIndexOf(rowList, row) : row
                const mergeColIndex = tableMethods.getVTColumnIndex(col)
                mList.push({
                  row: mergeRowIndex,
                  col: mergeColIndex,
                  rowspan,
                  colspan,
                  _row: row,
                  _col: col,
                  _rowspan: rowspan,
                  _colspan: colspan
                })
              }
            }
          }
        })
      }
    }

    const removeMerges = (merges: VxeTableDefines.MergeOptions | VxeTableDefines.MergeOptions[], mList: VxeTableDefines.MergeItem[], rowList?: any) => {
      const rest: any[] = []
      if (merges) {
        const { treeConfig } = props
        const { visibleColumn } = internalData
        if (!XEUtils.isArray(merges)) {
          merges = [merges]
        }
        if (treeConfig && merges.length) {
          errLog('vxe.error.noTree', ['merge-cells | merge-footer-items'])
        }
        merges.forEach((item: any) => {
          let { row, col }: any = item
          if (rowList && XEUtils.isNumber(row)) {
            row = rowList[row]
          }
          if (XEUtils.isNumber(col)) {
            col = visibleColumn[col]
          }
          const mcIndex = XEUtils.findIndexOf(mList, item => (item._row === row || getRowid($xetable, item._row) === getRowid($xetable, row)) && (item._col.id === col || item._col.id === col.id))
          if (mcIndex > -1) {
            const rItems = mList.splice(mcIndex, 1)
            rest.push(rItems[0])
          }
        })
      }
      return rest
    }

    const clearAllSort = () => {
      const { tableFullColumn } = internalData
      tableFullColumn.forEach((column: any) => {
        column.order = null
      })
    }

    const calcHeight = (key: 'height' | 'maxHeight') => {
      const { parentHeight } = reactData
      const val = props[key]
      let num = 0
      if (val) {
        if (val === 'auto') {
          num = parentHeight
        } else {
          const excludeHeight = $xetable.getExcludeHeight()
          if (isScale(val)) {
            num = Math.floor((XEUtils.toInteger(val) || 1) / 100 * parentHeight)
          } else {
            num = XEUtils.toNumber(val)
          }
          num = Math.max(40, num - excludeHeight)
        }
      }
      return num
    }

    /**
     * ??????????????????????????????
     */
    const restoreCustomStorage = () => {
      const { id, customConfig } = props
      const { collectColumn } = internalData
      const customOpts = computeCustomOpts.value
      const { storage } = customOpts
      const isResizable = storage === true || (storage && storage.resizable)
      const isVisible = storage === true || (storage && storage.visible)
      if (customConfig && (isResizable || isVisible)) {
        const customMap: any = {}
        if (!id) {
          errLog('vxe.error.reqProp', ['id'])
          return
        }
        if (isResizable) {
          const columnWidthStorage = getCustomStorageMap(resizableStorageKey)[id]
          if (columnWidthStorage) {
            XEUtils.each(columnWidthStorage, (resizeWidth, field) => {
              customMap[field] = { field, resizeWidth }
            })
          }
        }
        if (isVisible) {
          const columnVisibleStorage = getCustomStorageMap(visibleStorageKey)[id]
          if (columnVisibleStorage) {
            const colVisibles = columnVisibleStorage.split('|')
            const colHides = colVisibles[0] ? colVisibles[0].split(',') : []
            const colShows = colVisibles[1] ? colVisibles[1].split(',') : []
            colHides.forEach((field: any) => {
              if (customMap[field]) {
                customMap[field].visible = false
              } else {
                customMap[field] = { field, visible: false }
              }
            })
            colShows.forEach((field: any) => {
              if (customMap[field]) {
                customMap[field].visible = true
              } else {
                customMap[field] = { field, visible: true }
              }
            })
          }
        }
        const keyMap: any = {}
        XEUtils.eachTree(collectColumn, (column: any) => {
          const colKey = column.getKey()
          if (colKey) {
            keyMap[colKey] = column
          }
        })
        XEUtils.each(customMap, ({ visible, resizeWidth }, field) => {
          const column = keyMap[field]
          if (column) {
            if (XEUtils.isNumber(resizeWidth)) {
              column.resizeWidth = resizeWidth
            }
            if (XEUtils.isBoolean(visible)) {
              column.visible = visible
            }
          }
        })
      }
    }

    /**
     * ?????????????????? Map
     * ??????????????????????????????????????????????????????????????????
     */
    const cacheColumnMap = () => {
      const { tableFullColumn, collectColumn } = internalData
      const fullColumnIdData: any = internalData.fullColumnIdData = {}
      const fullColumnFieldData: any = internalData.fullColumnFieldData = {}
      const mouseOpts = computeMouseOpts.value
      const isGroup = collectColumn.some(hasChildrenList)
      let isAllOverflow = !!props.showOverflow
      const useCustomHeaderRowSpan = !!props.useCustomHeaderRowSpan
      let expandColumn: any
      let treeNodeColumn: any
      let checkboxColumn: any
      let radioColumn: any
      let hasFixed: any
      const handleFunc = (column: VxeTableDefines.ColumnInfo, index: number, items: VxeTableDefines.ColumnInfo[], path?: string[], parent?: VxeTableDefines.ColumnInfo) => {
        const { id: colid, field, fixed, type, treeNode } = column
        const rest = { column, colid, index, items, parent }
        if (field) {
          if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
            if (fullColumnFieldData[field]) {
              warnLog('vxe.error.colRepet', ['field', field])
            }
          }
          fullColumnFieldData[field] = rest
        }
        if (!hasFixed && fixed) {
          hasFixed = fixed
        }
        if (treeNode) {
          if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
            if (treeNodeColumn) {
              warnLog('vxe.error.colRepet', ['tree-node', treeNode])
            }
          }
          if (!treeNodeColumn) {
            treeNodeColumn = column
          }
        } else if (type === 'expand') {
          if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
            if (expandColumn) {
              warnLog('vxe.error.colRepet', ['type', type])
            }
          }
          if (!expandColumn) {
            expandColumn = column
          }
        }
        if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
          if (type === 'checkbox') {
            if (checkboxColumn) {
              warnLog('vxe.error.colRepet', ['type', type])
            }
            if (!checkboxColumn) {
              checkboxColumn = column
            }
          } else if (type === 'radio') {
            if (radioColumn) {
              warnLog('vxe.error.colRepet', ['type', type])
            }
            if (!radioColumn) {
              radioColumn = column
            }
          }
        }
        if (isAllOverflow && column.showOverflow === false) {
          isAllOverflow = false
        }
        if (fullColumnIdData[colid]) {
          errLog('vxe.error.colRepet', ['colId', colid])
        }
        fullColumnIdData[colid] = rest
      }
      if (isGroup) {
        XEUtils.eachTree(collectColumn, (column, index, items, path, parent, nodes) => {
          column.level = nodes.length
          handleFunc(column, index, items, path, parent)
        })
      } else {
        tableFullColumn.forEach(handleFunc)
      }

      if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
        if (expandColumn && mouseOpts.area) {
          errLog('vxe.error.errConflicts', ['mouse-config.area', 'column.type=expand'])
        }
      }
      reactData.useCustomHeaderRowSpan = useCustomHeaderRowSpan
      reactData.isGroup = isGroup
      reactData.treeNodeColumn = treeNodeColumn
      reactData.expandColumn = expandColumn
      reactData.isAllOverflow = isAllOverflow
    }

    const updateHeight = () => {
      internalData.customHeight = calcHeight('height')
      internalData.customMaxHeight = calcHeight('maxHeight')
    }

    /**
     * ????????????
     * ?????? px???%????????? ????????????
     * ??????????????????????????????
     * ???????????????????????????
     */
    const autoCellWidth = () => {
      const tableHeader = refTableHeader.value
      const tableBody = refTableBody.value
      const tableFooter = refTableFooter.value
      const bodyElem = tableBody ? tableBody.$el as HTMLDivElement : null
      const headerElem = tableHeader ? tableHeader.$el as HTMLDivElement : null
      const footerElem = tableFooter ? tableFooter.$el as HTMLDivElement : null
      if (!bodyElem) {
        return
      }
      let tableWidth = 0
      const minCellWidth = 40 // ?????????????????? 40px
      const bodyWidth = bodyElem.clientWidth - 1
      let remainWidth = bodyWidth
      let meanWidth = remainWidth / 100
      const { fit } = props
      const { columnStore } = reactData
      const { resizeList, pxMinList, pxList, scaleList, scaleMinList, autoList } = columnStore
      // ?????????
      pxMinList.forEach((column: any) => {
        const minWidth = parseInt(column.minWidth)
        tableWidth += minWidth
        column.renderWidth = minWidth
      })
      // ???????????????
      scaleMinList.forEach((column: any) => {
        const scaleWidth = Math.floor(parseInt(column.minWidth) * meanWidth)
        tableWidth += scaleWidth
        column.renderWidth = scaleWidth
      })
      // ???????????????
      scaleList.forEach((column: any) => {
        const scaleWidth = Math.floor(parseInt(column.width) * meanWidth)
        tableWidth += scaleWidth
        column.renderWidth = scaleWidth
      })
      // ?????????
      pxList.forEach((column: any) => {
        const width = parseInt(column.width)
        tableWidth += width
        column.renderWidth = width
      })
      // ???????????????
      resizeList.forEach((column: any) => {
        const width = parseInt(column.resizeWidth)
        tableWidth += width
        column.renderWidth = width
      })
      remainWidth -= tableWidth
      meanWidth = remainWidth > 0 ? Math.floor(remainWidth / (scaleMinList.length + pxMinList.length + autoList.length)) : 0
      if (fit) {
        if (remainWidth > 0) {
          scaleMinList.concat(pxMinList).forEach((column: any) => {
            tableWidth += meanWidth
            column.renderWidth += meanWidth
          })
        }
      } else {
        meanWidth = minCellWidth
      }
      // ?????????
      autoList.forEach((column: any) => {
        const width = Math.max(meanWidth, minCellWidth)
        column.renderWidth = width
        tableWidth += width
      })
      if (fit) {
        /**
         * ???????????????
         * ?????????????????????????????????????????????????????????????????????
         */
        const dynamicList = scaleList.concat(scaleMinList).concat(pxMinList).concat(autoList)
        let dynamicSize = dynamicList.length - 1
        if (dynamicSize > 0) {
          let odiffer = bodyWidth - tableWidth
          if (odiffer > 0) {
            while (odiffer > 0 && dynamicSize >= 0) {
              odiffer--
              dynamicList[dynamicSize--].renderWidth++
            }
            tableWidth = bodyWidth
          }
        }
      }
      const tableHeight = bodyElem.offsetHeight
      const overflowY = bodyElem.scrollHeight > bodyElem.clientHeight
      let scrollbarWidth = 0
      if (overflowY) {
        scrollbarWidth = Math.max(bodyElem.offsetWidth - bodyElem.clientWidth, 0)
      }
      reactData.scrollbarWidth = scrollbarWidth
      reactData.overflowY = overflowY
      internalData.tableWidth = tableWidth
      internalData.tableHeight = tableHeight
      let headerHeight = 0
      if (headerElem) {
        headerHeight = headerElem.clientHeight
        nextTick(() => {
          // ????????????????????????
          if (headerElem && bodyElem && headerElem.scrollLeft !== bodyElem.scrollLeft) {
            headerElem.scrollLeft = bodyElem.scrollLeft
          }
        })
      }
      internalData.headerHeight = headerHeight

      let overflowX = false
      let footerHeight = 0
      let scrollbarHeight = 0
      if (footerElem) {
        footerHeight = footerElem.offsetHeight
        overflowX = tableWidth > footerElem.clientWidth
        if (overflowX) {
          scrollbarHeight = Math.max(footerHeight - footerElem.clientHeight, 0)
        }
      } else {
        overflowX = tableWidth > bodyWidth
        if (overflowX) {
          scrollbarHeight = Math.max(tableHeight - bodyElem.clientHeight, 0)
        }
      }
      internalData.footerHeight = footerHeight
      reactData.overflowX = overflowX
      reactData.scrollbarHeight = scrollbarHeight
      updateHeight()
      reactData.parentHeight = Math.max(internalData.headerHeight + footerHeight + 20, tablePrivateMethods.getParentHeight())
      if (overflowX) {
        tablePrivateMethods.checkScrolling()
      }
    }

    const getOrderField = (column: any) => {
      const { sortBy, sortType } = column
      return (row: any) => {
        let cellValue
        if (sortBy) {
          cellValue = XEUtils.isFunction(sortBy) ? sortBy({ row, column }) : XEUtils.get(row, sortBy)
        } else {
          cellValue = tablePrivateMethods.getCellLabel(row, column)
        }
        if (!sortType || sortType === 'auto') {
          return isNaN(cellValue) ? cellValue : XEUtils.toNumber(cellValue)
        } else if (sortType === 'number') {
          return XEUtils.toNumber(cellValue)
        } else if (sortType === 'string') {
          return XEUtils.toValueString(cellValue)
        }
        return cellValue
      }
    }

    /**
     * ?????????
     * ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
     */
    const updateAfterDataIndex = () => {
      const { treeConfig } = props
      const { afterFullData, fullDataRowIdData, fullAllDataRowIdData } = internalData
      const { afterTreeFullData } = internalData
      const treeOpts = computeTreeOpts.value
      if (treeConfig) {
        XEUtils.eachTree(afterTreeFullData, (row, index, items, path) => {
          const rowid = getRowid($xetable, row)
          const allrest = fullAllDataRowIdData[rowid]
          const seq = path.map((num, i) => i % 2 === 0 ? (Number(num) + 1) : '.').join('')
          if (allrest) {
            allrest.seq = seq
            allrest._index = index
          } else {
            const rest = { row, rowid, seq, index: -1, $index: -1, _index: index, items: [], parent: null, level: 0 }
            fullAllDataRowIdData[rowid] = rest
            fullDataRowIdData[rowid] = rest
          }
        }, { children: treeOpts.transform ? treeOpts.mapChildren : treeOpts.children })
      } else {
        afterFullData.forEach((row, index) => {
          const rowid = getRowid($xetable, row)
          const allrest = fullAllDataRowIdData[rowid]
          const seq = index + 1
          if (allrest) {
            allrest.seq = seq
            allrest._index = index
          } else {
            const rest = { row, rowid, seq, index: -1, $index: -1, _index: index, items: [], parent: null, level: 0 }
            fullAllDataRowIdData[rowid] = rest
            fullDataRowIdData[rowid] = rest
          }
        })
      }
    }

    /**
     * ???????????????????????????????????????
     * @returns
     */
    const handleVirtualTreeToList = () => {
      const { treeConfig } = props
      const { treeExpandeds } = reactData
      const treeOpts = computeTreeOpts.value
      if (treeConfig && treeOpts.transform) {
        const fullData: any = []
        const expandMaps: Map<any, number> = new Map()
        XEUtils.eachTree(internalData.afterTreeFullData, (row, index, items, path, parent) => {
          if (!parent || (expandMaps.has(parent) && $xetable.findRowIndexOf(treeExpandeds, parent) > -1)) {
            expandMaps.set(row, 1)
            fullData.push(row)
          }
        }, { children: treeOpts.mapChildren })
        internalData.afterFullData = fullData
        updateScrollYStatus(fullData)
        return fullData
      }
      return internalData.afterFullData
    }

    /**
     * ????????????????????????????????????
     * ???????????????????????????????????????
     */
    const updateAfterFullData = () => {
      const { treeConfig } = props
      const { tableFullColumn, tableFullData, tableFullTreeData } = internalData
      const filterOpts = computeFilterOpts.value
      const sortOpts = computeSortOpts.value
      const treeOpts = computeTreeOpts.value
      const { transform } = treeOpts
      const { remote: allRemoteFilter, filterMethod: allFilterMethod } = filterOpts
      const { remote: allRemoteSort, sortMethod: allSortMethod, multiple: sortMultiple, chronological } = sortOpts
      let tableData: any[] = []
      let tableTree: any[] = []

      // ?????????
      if (!allRemoteFilter || !allRemoteSort) {
        const filterColumns: {
          column: VxeTableDefines.ColumnInfo
          valueList: any[]
          itemList: VxeTableDefines.FilterOption[]
        }[] = []
        let orderColumns: VxeTableDefines.SortCheckedParams[] = []
        tableFullColumn.forEach((column) => {
          const { field, sortable, order, filters } = column
          if (!allRemoteFilter && filters && filters.length) {
            const valueList: any[] = []
            const itemList: VxeTableDefines.FilterOption[] = []
            filters.forEach((item) => {
              if (item.checked) {
                itemList.push(item as VxeTableDefines.FilterOption)
                valueList.push(item.value)
              }
            })
            if (itemList.length) {
              filterColumns.push({ column, valueList, itemList })
            }
          }
          if (!allRemoteSort && sortable && order) {
            orderColumns.push({ column, field, property: field, order, sortTime: column.sortTime })
          }
        })
        if (sortMultiple && chronological && orderColumns.length > 1) {
          orderColumns = XEUtils.orderBy(orderColumns, 'sortTime')
        }

        // ????????????
        // ????????????????????????????????????
        if (!allRemoteFilter && filterColumns.length) {
          const handleFilter = (row: any) => {
            return filterColumns.every(({ column, valueList, itemList }) => {
              const { filterMethod, filterRender } = column
              const compConf = filterRender ? VXETable.renderer.get(filterRender.name) : null
              const compFilterMethod = compConf ? compConf.filterMethod : null
              const defaultFilterMethod = compConf ? compConf.defaultFilterMethod : null
              const cellValue = getCellValue(row, column)
              if (filterMethod) {
                return itemList.some((item) => filterMethod({ value: item.value, option: item, cellValue, row, column, $table: $xetable }))
              } else if (compFilterMethod) {
                return itemList.some((item) => compFilterMethod({ value: item.value, option: item, cellValue, row, column, $table: $xetable }))
              } else if (allFilterMethod) {
                return allFilterMethod({ options: itemList, values: valueList, cellValue, row, column })
              } else if (defaultFilterMethod) {
                return itemList.some((item) => defaultFilterMethod({ value: item.value, option: item, cellValue, row, column, $table: $xetable }))
              }
              return valueList.indexOf(XEUtils.get(row, column.field)) > -1
            })
          }
          if (treeConfig && transform) {
            // ???????????????
            tableTree = XEUtils.searchTree(tableFullTreeData, handleFilter, { ...treeOpts, original: true })
            tableData = tableTree
          } else {
            tableData = treeConfig ? tableFullTreeData.filter(handleFilter) : tableFullData.filter(handleFilter)
            tableTree = tableData
          }
        } else {
          if (treeConfig && transform) {
            // ???????????????
            tableTree = XEUtils.searchTree(tableFullTreeData, () => true, { ...treeOpts, original: true })
            tableData = tableTree
          } else {
            tableData = treeConfig ? tableFullTreeData.slice(0) : tableFullData.slice(0)
            tableTree = tableData
          }
        }

        // ??????????????????????????????????????????
        // ????????????????????????????????????
        if (!allRemoteSort && orderColumns.length) {
          if (treeConfig && transform) {
            // ???????????????????????????????????????????????????
            if (allSortMethod) {
              const sortRests = allSortMethod({ data: tableTree, sortList: orderColumns, $table: $xetable })
              tableTree = XEUtils.isArray(sortRests) ? sortRests : tableTree
            } else {
              tableTree = XEUtils.orderBy(tableTree, orderColumns.map(({ column, order }) => [getOrderField(column), order]))
            }
            tableData = tableTree
          } else {
            if (allSortMethod) {
              const sortRests = allSortMethod({ data: tableData, sortList: orderColumns, $table: $xetable })
              tableData = XEUtils.isArray(sortRests) ? sortRests : tableData
            } else {
              tableData = XEUtils.orderBy(tableData, orderColumns.map(({ column, order }) => [getOrderField(column), order]))
            }
            tableTree = tableData
          }
        }
      } else {
        if (treeConfig && transform) {
          // ???????????????
          tableTree = XEUtils.searchTree(tableFullTreeData, () => true, { ...treeOpts, original: true })
          tableData = tableTree
        } else {
          tableData = treeConfig ? tableFullTreeData.slice(0) : tableFullData.slice(0)
          tableTree = tableData
        }
      }
      internalData.afterFullData = tableData
      internalData.afterTreeFullData = tableTree
      updateAfterDataIndex()
    }

    const updateStyle = () => {
      const { border, showFooter, showOverflow: allColumnOverflow, showHeaderOverflow: allColumnHeaderOverflow, showFooterOverflow: allColumnFooterOverflow, mouseConfig, spanMethod, footerSpanMethod, keyboardConfig } = props
      let { isGroup, currentRow, tableColumn, scrollXLoad, scrollYLoad, scrollbarWidth, scrollbarHeight, columnStore, editStore, mergeList, mergeFooterList, isAllOverflow } = reactData
      let { visibleColumn, fullColumnIdData, tableHeight, tableWidth, headerHeight, footerHeight, elemStore, customHeight, customMaxHeight } = internalData
      const containerList = ['main', 'left', 'right']
      const emptyPlaceholderElem = refEmptyPlaceholder.value
      const cellOffsetWidth = computeCellOffsetWidth.value
      const mouseOpts = computeMouseOpts.value
      const keyboardOpts = computeKeyboardOpts.value
      const bodyWrapperRef = elemStore['main-body-wrapper']
      const bodyWrapperElem = bodyWrapperRef ? bodyWrapperRef.value : null
      if (emptyPlaceholderElem) {
        emptyPlaceholderElem.style.top = `${headerHeight}px`
        emptyPlaceholderElem.style.height = bodyWrapperElem ? `${bodyWrapperElem.offsetHeight - scrollbarHeight}px` : ''
      }
      if (customHeight > 0) {
        if (showFooter) {
          customHeight += scrollbarHeight
        }
      }
      containerList.forEach((name, index) => {
        const fixedType = index > 0 ? name : ''
        const layoutList = ['header', 'body', 'footer']
        const isFixedLeft = fixedType === 'left'
        let fixedColumn: VxeTableDefines.ColumnInfo[] = []
        let fixedWrapperElem: HTMLDivElement
        if (fixedType) {
          fixedColumn = isFixedLeft ? columnStore.leftList : columnStore.rightList
          fixedWrapperElem = isFixedLeft ? refLeftContainer.value : refRightContainer.value
        }
        layoutList.forEach(layout => {
          const wrapperRef = elemStore[`${name}-${layout}-wrapper`]
          const wrapperElem = wrapperRef ? wrapperRef.value : null
          const tableRef = elemStore[`${name}-${layout}-table`]
          const tableElem = tableRef ? tableRef.value : null
          if (layout === 'header') {
            // ?????????????????????
            // ??????????????????
            let tWidth = tableWidth

            // ???????????????????????????
            let isOptimize = false
            if (!isGroup) {
              if (fixedType) {
                if (scrollXLoad || allColumnHeaderOverflow) {
                  isOptimize = true
                }
              }
            }
            if (isOptimize) {
              tableColumn = fixedColumn
            }
            tWidth = tableColumn.reduce((previous, column) => previous + column.renderWidth, 0)

            if (tableElem) {
              tableElem.style.width = tWidth ? `${tWidth + scrollbarWidth}px` : ''
              // ?????? IE ??????????????????????????????
              if (browse.msie) {
                XEUtils.arrayEach(tableElem.querySelectorAll('.vxe-resizable'), (resizeElem: any) => {
                  resizeElem.style.height = `${resizeElem.parentNode.offsetHeight}px`
                })
              }
            }

            const repairRef = elemStore[`${name}-${layout}-repair`]
            const repairElem = repairRef ? repairRef.value : null
            if (repairElem) {
              repairElem.style.width = `${tableWidth}px`
            }

            const listRef = elemStore[`${name}-${layout}-list`]
            const listElem = listRef ? listRef.value : null
            if (isGroup && listElem) {
              XEUtils.arrayEach(listElem.querySelectorAll('.col--group'), (thElem: any) => {
                const colNode = tableMethods.getColumnNode(thElem)
                if (colNode) {
                  const column = colNode.item
                  const { showHeaderOverflow } = column
                  const cellOverflow = XEUtils.isBoolean(showHeaderOverflow) ? showHeaderOverflow : allColumnHeaderOverflow
                  const showEllipsis = cellOverflow === 'ellipsis'
                  const showTitle = cellOverflow === 'title'
                  const showTooltip = cellOverflow === true || cellOverflow === 'tooltip'
                  const hasEllipsis = showTitle || showTooltip || showEllipsis
                  let childWidth = 0
                  let countChild = 0
                  if (hasEllipsis) {
                    XEUtils.eachTree(column.children, (item) => {
                      if (!item.children || !column.children.length) {
                        countChild++
                      }
                      childWidth += item.renderWidth
                    }, { children: 'children' })
                  }
                  thElem.style.width = hasEllipsis ? `${childWidth - countChild - (border ? 2 : 0)}px` : ''
                }
              })
            }
          } else if (layout === 'body') {
            const emptyBlockRef = elemStore[`${name}-${layout}-emptyBlock`]
            const emptyBlockElem = emptyBlockRef ? emptyBlockRef.value : null
            if (isNodeElement(wrapperElem)) {
              if (customMaxHeight) {
                wrapperElem.style.maxHeight = `${fixedType ? customMaxHeight - headerHeight - (showFooter ? 0 : scrollbarHeight) : customMaxHeight - headerHeight}px`
              } else {
                if (customHeight > 0) {
                  wrapperElem.style.height = `${fixedType ? (customHeight > 0 ? customHeight - headerHeight - footerHeight : tableHeight) - (showFooter ? 0 : scrollbarHeight) : customHeight - headerHeight - footerHeight}px`
                } else {
                  wrapperElem.style.height = ''
                }
              }
            }

            // ??????????????????
            if (fixedWrapperElem) {
              if (isNodeElement(wrapperElem)) {
                wrapperElem.style.top = `${headerHeight}px`
              }
              fixedWrapperElem.style.height = `${(customHeight > 0 ? customHeight - headerHeight - footerHeight : tableHeight) + headerHeight + footerHeight - scrollbarHeight * (showFooter ? 2 : 1)}px`
              fixedWrapperElem.style.width = `${fixedColumn.reduce((previous, column) => previous + column.renderWidth, isFixedLeft ? 0 : scrollbarWidth)}px`
            }

            let tWidth = tableWidth

            // ???????????????????????????
            if (fixedType) {
              if (scrollYLoad || (allColumnOverflow ? isAllOverflow : allColumnOverflow)) {
                if (!mergeList.length && !spanMethod && !(keyboardConfig && keyboardOpts.isMerge)) {
                  tableColumn = fixedColumn
                } else {
                  tableColumn = visibleColumn
                }
              } else {
                tableColumn = visibleColumn
              }
            }
            tWidth = tableColumn.reduce((previous, column) => previous + column.renderWidth, 0)

            if (tableElem) {
              tableElem.style.width = tWidth ? `${tWidth}px` : ''
              // ???????????????
              tableElem.style.paddingRight = scrollbarWidth && fixedType && (browse['-moz'] || browse.safari) ? `${scrollbarWidth}px` : ''
            }
            if (emptyBlockElem) {
              emptyBlockElem.style.width = tWidth ? `${tWidth}px` : ''
            }
          } else if (layout === 'footer') {
            let tWidth = tableWidth

            // ???????????????????????????
            if (fixedType) {
              if (scrollXLoad || allColumnFooterOverflow) {
                if (!mergeFooterList.length || !footerSpanMethod) {
                  tableColumn = fixedColumn
                } else {
                  tableColumn = visibleColumn
                }
              } else {
                tableColumn = visibleColumn
              }
            }
            tWidth = tableColumn.reduce((previous, column) => previous + column.renderWidth, 0)

            if (isNodeElement(wrapperElem)) {
              // ??????????????????
              if (fixedWrapperElem) {
                wrapperElem.style.top = `${customHeight > 0 ? customHeight - footerHeight : tableHeight + headerHeight}px`
              }
              wrapperElem.style.marginTop = `${-Math.max(1, scrollbarHeight)}px`
            }
            if (tableElem) {
              tableElem.style.width = tWidth ? `${tWidth + scrollbarWidth}px` : ''
            }
          }
          const colgroupRef = elemStore[`${name}-${layout}-colgroup`]
          const colgroupElem = colgroupRef ? colgroupRef.value : null
          if (colgroupElem) {
            XEUtils.arrayEach(colgroupElem.children, (colElem: any) => {
              const colid = colElem.getAttribute('name')
              if (colid === 'col_gutter') {
                colElem.style.width = `${scrollbarWidth}px`
              }
              if (fullColumnIdData[colid]) {
                const column = fullColumnIdData[colid].column
                const { showHeaderOverflow, showFooterOverflow, showOverflow } = column
                let cellOverflow
                colElem.style.width = `${column.renderWidth}px`
                if (layout === 'header') {
                  cellOverflow = XEUtils.isUndefined(showHeaderOverflow) || XEUtils.isNull(showHeaderOverflow) ? allColumnHeaderOverflow : showHeaderOverflow
                } else if (layout === 'footer') {
                  cellOverflow = XEUtils.isUndefined(showFooterOverflow) || XEUtils.isNull(showFooterOverflow) ? allColumnFooterOverflow : showFooterOverflow
                } else {
                  cellOverflow = XEUtils.isUndefined(showOverflow) || XEUtils.isNull(showOverflow) ? allColumnOverflow : showOverflow
                }
                const showEllipsis = cellOverflow === 'ellipsis'
                const showTitle = cellOverflow === 'title'
                const showTooltip = cellOverflow === true || cellOverflow === 'tooltip'
                let hasEllipsis = showTitle || showTooltip || showEllipsis
                const listRef = elemStore[`${name}-${layout}-list`]
                const listElem = listRef ? listRef.value : null
                // ???????????????????????????????????????
                if (scrollYLoad && !hasEllipsis) {
                  hasEllipsis = true
                }
                if (listElem) {
                  XEUtils.arrayEach(listElem.querySelectorAll(`.${column.id}`), (elem: any) => {
                    const colspan = parseInt(elem.getAttribute('colspan') || 1)
                    const cellElem = elem.querySelector('.vxe-cell')
                    let colWidth = column.renderWidth
                    if (cellElem) {
                      if (colspan > 1) {
                        const columnIndex = tableMethods.getColumnIndex(column)
                        for (let index = 1; index < colspan; index++) {
                          const nextColumn = tableMethods.getColumns(columnIndex + index)
                          if (nextColumn) {
                            colWidth += nextColumn.renderWidth
                          }
                        }
                      }
                      cellElem.style.width = hasEllipsis ? `${colWidth - (cellOffsetWidth * colspan)}px` : ''
                    }
                  })
                }
              }
            })
          }
        })
      })
      if (currentRow) {
        tableMethods.setCurrentRow(currentRow)
      }
      if (mouseConfig && mouseOpts.selected && editStore.selected.row && editStore.selected.column) {
        $xetable.addCellSelectedClass()
      }
      return nextTick()
    }

    const checkValidate = (type: any) => {
      if ($xetable.triggerValidate) {
        return $xetable.triggerValidate(type)
      }
      return nextTick()
    }

    /**
     * ???????????????????????????
     * ??????????????????????????????
     */
    const handleChangeCell = (evnt: Event, params: any) => {
      checkValidate('blur')
        .catch((e: any) => e)
        .then(() => {
          $xetable.handleActived(params, evnt)
            .then(() => checkValidate('change'))
            .catch((e: any) => e)
        })
    }

    const handleDefaultSort = () => {
      const { sortConfig } = props
      if (sortConfig) {
        const sortOpts = computeSortOpts.value
        let { defaultSort } = sortOpts
        if (defaultSort) {
          if (!XEUtils.isArray(defaultSort)) {
            defaultSort = [defaultSort]
          }
          if (defaultSort.length) {
            (sortConfig.multiple ? defaultSort : defaultSort.slice(0, 1)).forEach((item: any, index: number) => {
              const { field, order } = item
              if (field && order) {
                const column = tableMethods.getColumnByField(field)
                if (column && column.sortable) {
                  column.order = order
                  column.sortTime = Date.now() + index
                }
              }
            })
            if (!sortOpts.remote) {
              tablePrivateMethods.handleTableData(true).then(updateStyle)
            }
          }
        }
      }
    }

    /**
     * ??????????????????
     */
    const handleDefaultSelectionChecked = () => {
      const { checkboxConfig } = props
      if (checkboxConfig) {
        const { fullDataRowIdData } = internalData
        const checkboxOpts = computeCheckboxOpts.value
        const { checkAll, checkRowKeys } = checkboxOpts
        if (checkAll) {
          tableMethods.setAllCheckboxRow(true)
        } else if (checkRowKeys) {
          const defSelection: any[] = []
          checkRowKeys.forEach((rowid: any) => {
            if (fullDataRowIdData[rowid]) {
              defSelection.push(fullDataRowIdData[rowid].row)
            }
          })
          tableMethods.setCheckboxRow(defSelection, true)
        }
      }
    }

    /**
     * ???????????????????????????
     */
    const handleDefaultRadioChecked = () => {
      const { radioConfig } = props
      if (radioConfig) {
        const { fullDataRowIdData } = internalData
        const radioOpts = computeRadioOpts.value
        const { checkRowKey: rowid, reserve } = radioOpts
        if (rowid) {
          if (fullDataRowIdData[rowid]) {
            tableMethods.setRadioRow(fullDataRowIdData[rowid].row)
          }
          if (reserve) {
            const rowkey = getRowkey($xetable)
            internalData.radioReserveRow = { [rowkey]: rowid }
          }
        }
      }
    }

    /**
     * ?????????????????????
     */
    const handleDefaultRowExpand = () => {
      const { expandConfig } = props
      if (expandConfig) {
        const { fullDataRowIdData } = internalData
        const expandOpts = computeExpandOpts.value
        const { expandAll, expandRowKeys } = expandOpts
        if (expandAll) {
          tableMethods.setAllRowExpand(true)
        } else if (expandRowKeys) {
          const defExpandeds: any[] = []
          expandRowKeys.forEach((rowid: any) => {
            if (fullDataRowIdData[rowid]) {
              defExpandeds.push(fullDataRowIdData[rowid].row)
            }
          })
          tableMethods.setRowExpand(defExpandeds, true)
        }
      }
    }

    const handleRadioReserveRow = (row: any) => {
      const radioOpts = computeRadioOpts.value
      if (radioOpts.reserve) {
        internalData.radioReserveRow = row
      }
    }

    const handleCheckboxReserveRow = (row: any, checked: boolean) => {
      const { checkboxReserveRowMap } = internalData
      const checkboxOpts = computeCheckboxOpts.value
      if (checkboxOpts.reserve) {
        const rowid = getRowid($xetable, row)
        if (checked) {
          checkboxReserveRowMap[rowid] = row
        } else if (checkboxReserveRowMap[rowid]) {
          delete checkboxReserveRowMap[rowid]
        }
      }
    }

    // ????????????????????????????????????
    const handleReserveStatus = () => {
      const { treeConfig } = props
      const { expandColumn, currentRow, selectRow, selection, rowExpandeds, treeExpandeds } = reactData
      const { fullDataRowIdData, fullAllDataRowIdData, radioReserveRow } = internalData
      const expandOpts = computeExpandOpts.value
      const treeOpts = computeTreeOpts.value
      const radioOpts = computeRadioOpts.value
      const checkboxOpts = computeCheckboxOpts.value
      // ?????????
      if (selectRow && !fullAllDataRowIdData[getRowid($xetable, selectRow)]) {
        reactData.selectRow = null // ?????????????????????
      }
      // ????????????????????????
      if (radioOpts.reserve && radioReserveRow) {
        const rowid = getRowid($xetable, radioReserveRow)
        if (fullDataRowIdData[rowid]) {
          tableMethods.setRadioRow(fullDataRowIdData[rowid].row)
        }
      }
      // ?????????
      reactData.selection = getRecoverRow(selection) // ?????????????????????
      // ????????????????????????
      if (checkboxOpts.reserve) {
        tableMethods.setCheckboxRow(handleReserveRow(internalData.checkboxReserveRowMap), true)
      }
      if (currentRow && !fullAllDataRowIdData[getRowid($xetable, currentRow)]) {
        reactData.currentRow = null // ?????????????????????
      }
      // ?????????
      reactData.rowExpandeds = expandColumn ? getRecoverRow(rowExpandeds) : [] // ?????????????????????
      // ??????????????????
      if (expandColumn && expandOpts.reserve) {
        tableMethods.setRowExpand(handleReserveRow(internalData.rowExpandedReserveRowMap), true)
      }
      // ?????????
      reactData.treeExpandeds = treeConfig ? getRecoverRow(treeExpandeds) : [] // ?????????????????????
      if (treeConfig && treeOpts.reserve) {
        tableMethods.setTreeExpand(handleReserveRow(internalData.treeExpandedReserveRowMap), true)
      }
    }

    /**
     * ???????????????????????????
     */
    const handleDefaultTreeExpand = () => {
      const { treeConfig } = props
      if (treeConfig) {
        const { tableFullData } = internalData
        const treeOpts = computeTreeOpts.value
        const { expandAll, expandRowKeys } = treeOpts
        if (expandAll) {
          tableMethods.setAllTreeExpand(true)
        } else if (expandRowKeys) {
          const defExpandeds: any[] = []
          const rowkey = getRowkey($xetable)
          expandRowKeys.forEach((rowid: any) => {
            const matchObj = XEUtils.findTree(tableFullData, item => rowid === XEUtils.get(item, rowkey), treeOpts)
            if (matchObj) {
              defExpandeds.push(matchObj.item)
            }
          })
          tableMethods.setTreeExpand(defExpandeds, true)
        }
      }
    }

    const handleAsyncTreeExpandChilds = (row: any): Promise<void> => {
      const { treeExpandeds, treeLazyLoadeds } = reactData
      const { fullAllDataRowIdData } = internalData
      const treeOpts = computeTreeOpts.value
      const checkboxOpts = computeCheckboxOpts.value
      const { transform, loadMethod } = treeOpts
      const { checkStrictly } = checkboxOpts
      const rest = fullAllDataRowIdData[getRowid($xetable, row)]
      return new Promise(resolve => {
        if (loadMethod) {
          treeLazyLoadeds.push(row)
          loadMethod({ $table: $xetable, row }).then((childRecords: any) => {
            rest.treeLoaded = true
            XEUtils.remove(treeLazyLoadeds, item => $xetable.eqRow(item, row))
            if (!XEUtils.isArray(childRecords)) {
              childRecords = []
            }
            if (childRecords) {
              return tableMethods.loadTreeChildren(row, childRecords).then(childRows => {
                if (childRows.length && $xetable.findRowIndexOf(treeExpandeds, row) === -1) {
                  treeExpandeds.push(row)
                }
                // ???????????????????????????????????????????????????????????????
                if (!checkStrictly && tableMethods.isCheckedByCheckboxRow(row)) {
                  tableMethods.setCheckboxRow(childRows, true)
                }
                return nextTick().then(() => {
                  if (transform) {
                    return tablePrivateMethods.handleTableData()
                  }
                })
              })
            }
          }).catch(() => {
            rest.treeLoaded = false
            XEUtils.remove(treeLazyLoadeds, item => $xetable.eqRow(item, row))
          }).finally(() => {
            nextTick().then(() => tableMethods.recalculate()).then(() => resolve())
          })
        } else {
          resolve()
        }
      })
    }

    const handleTreeExpandReserve = (row: any, expanded: boolean) => {
      const { treeExpandedReserveRowMap } = internalData
      const treeOpts = computeTreeOpts.value
      if (treeOpts.reserve) {
        const rowid = getRowid($xetable, row)
        if (expanded) {
          treeExpandedReserveRowMap[rowid] = row
        } else if (treeExpandedReserveRowMap[rowid]) {
          delete treeExpandedReserveRowMap[rowid]
        }
      }
    }

    const handleAsyncRowExpand = (row: any): Promise<void> => {
      const { fullAllDataRowIdData } = internalData
      return new Promise(resolve => {
        const expandOpts = computeExpandOpts.value
        const { loadMethod } = expandOpts
        if (loadMethod) {
          const rest = fullAllDataRowIdData[getRowid($xetable, row)]
          reactData.expandLazyLoadeds.push(row)
          loadMethod({ $table: $xetable, row, rowIndex: tableMethods.getRowIndex(row), $rowIndex: tableMethods.getVMRowIndex(row) }).then(() => {
            rest.expandLoaded = true
            reactData.rowExpandeds.push(row)
          }).catch(() => {
            rest.expandLoaded = false
          }).finally(() => {
            XEUtils.remove(reactData.expandLazyLoadeds, item => $xetable.eqRow(item, row))
            resolve(nextTick().then(() => tableMethods.recalculate()))
          })
        } else {
          resolve()
        }
      })
    }

    const handleRowExpandReserve = (row: any, expanded: boolean) => {
      const { rowExpandedReserveRowMap } = internalData
      const expandOpts = computeExpandOpts.value
      if (expandOpts.reserve) {
        const rowid = getRowid($xetable, row)
        if (expanded) {
          rowExpandedReserveRowMap[rowid] = row
        } else if (rowExpandedReserveRowMap[rowid]) {
          delete rowExpandedReserveRowMap[rowid]
        }
      }
    }

    const handleDefaultMergeCells = () => {
      const { mergeCells } = props
      if (mergeCells) {
        tableMethods.setMergeCells(mergeCells)
      }
    }

    const handleDefaultMergeFooterItems = () => {
      const { mergeFooterItems } = props
      if (mergeFooterItems) {
        tableMethods.setMergeFooterItems(mergeFooterItems)
      }
    }

    // ??????????????????????????????
    const computeScrollLoad = () => {
      return nextTick().then(() => {
        const { scrollXLoad, scrollYLoad } = reactData
        const { scrollXStore, scrollYStore } = internalData
        const sYOpts = computeSYOpts.value
        const sXOpts = computeSXOpts.value
        // ?????? X ??????
        if (scrollXLoad) {
          const { visibleSize: visibleXSize } = computeVirtualX()
          const offsetXSize = sXOpts.oSize ? XEUtils.toNumber(sXOpts.oSize) : browse.msie ? 10 : (browse.edge ? 5 : 0)
          scrollXStore.offsetSize = offsetXSize
          scrollXStore.visibleSize = visibleXSize
          scrollXStore.endIndex = Math.max(scrollXStore.startIndex + scrollXStore.visibleSize + offsetXSize, scrollXStore.endIndex)
          tablePrivateMethods.updateScrollXData()
        } else {
          tablePrivateMethods.updateScrollXSpace()
        }
        // ?????? Y ??????
        const { rowHeight, visibleSize: visibleYSize } = computeVirtualY()
        scrollYStore.rowHeight = rowHeight
        if (scrollYLoad) {
          const offsetYSize = sYOpts.oSize ? XEUtils.toNumber(sYOpts.oSize) : browse.msie ? 20 : (browse.edge ? 10 : 0)
          scrollYStore.offsetSize = offsetYSize
          scrollYStore.visibleSize = visibleYSize
          scrollYStore.endIndex = Math.max(scrollYStore.startIndex + visibleYSize + offsetYSize, scrollYStore.endIndex)
          tablePrivateMethods.updateScrollYData()
        } else {
          tablePrivateMethods.updateScrollYSpace()
        }
        reactData.rowHeight = rowHeight
        nextTick(updateStyle)
      })
    }
    /**
     * ??????????????????
     * @param {Array} datas ??????
     */
    const loadTableData = (datas: any[]) => {
      const { keepSource, treeConfig } = props
      const { editStore, scrollYLoad: oldScrollYLoad } = reactData
      const { scrollYStore, scrollXStore, lastScrollLeft, lastScrollTop } = internalData
      const treeOpts = computeTreeOpts.value
      const { transform } = treeOpts
      let treeData = []
      let fullData = datas ? datas.slice(0) : []
      if (treeConfig) {
        if (transform) {
          // ?????????????????????
          if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
            if (!treeOpts.rowField) {
              errLog('vxe.error.reqProp', ['tree-config.rowField'])
            }
            if (!treeOpts.parentField) {
              errLog('vxe.error.reqProp', ['tree-config.parentField'])
            }
            if (!treeOpts.children) {
              errLog('vxe.error.reqProp', ['tree-config.children'])
            }
            if (!treeOpts.mapChildren) {
              errLog('vxe.error.reqProp', ['tree-config.mapChildren'])
            }
            if (treeOpts.children === treeOpts.mapChildren) {
              errLog('vxe.error.errConflicts', ['tree-config.children', 'tree-config.mapChildren'])
            }
            fullData.forEach(row => {
              if (row[treeOpts.children] && row[treeOpts.children].length) {
                warnLog('vxe.error.errConflicts', ['tree-config.transform', `row.${treeOpts.children}`])
              }
            })
          }
          treeData = XEUtils.toArrayTree(fullData, {
            key: treeOpts.rowField,
            parentKey: treeOpts.parentField,
            children: treeOpts.children,
            mapChildren: treeOpts.mapChildren
          })
          fullData = treeData.slice(0)
        } else {
          treeData = fullData.slice(0)
        }
      }
      scrollYStore.startIndex = 0
      scrollYStore.endIndex = 1
      scrollXStore.startIndex = 0
      scrollXStore.endIndex = 1
      editStore.insertList = []
      editStore.removeList = []
      const sYLoad = updateScrollYStatus(fullData)
      reactData.scrollYLoad = sYLoad
      // ????????????
      internalData.tableFullData = fullData
      internalData.tableFullTreeData = treeData
      // ????????????
      tablePrivateMethods.cacheRowMap(true)
      // ????????????
      internalData.tableSynchData = datas
      // ??????????????????????????????????????????????????????????????????
      if (keepSource) {
        internalData.tableSourceData = XEUtils.clone(fullData, true)
      }
      if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
        if (sYLoad) {
          if (!(props.height || props.maxHeight)) {
            errLog('vxe.error.reqProp', ['table.height | table.max-height | table.scroll-y={enabled: false}'])
          }
          if (!props.showOverflow) {
            warnLog('vxe.error.reqProp', ['table.show-overflow'])
          }
          if (props.spanMethod) {
            warnLog('vxe.error.scrollErrProp', ['table.span-method'])
          }
        }
      }
      if ($xetable.clearCellAreas && props.mouseConfig) {
        $xetable.clearCellAreas()
        $xetable.clearCopyCellArea()
      }
      tableMethods.clearMergeCells()
      tableMethods.clearMergeFooterItems()
      tablePrivateMethods.handleTableData(true)
      tableMethods.updateFooter()
      return nextTick().then(() => {
        updateHeight()
        updateStyle()
      }).then(() => {
        computeScrollLoad()
      }).then(() => {
        // ???????????????????????????
        if (sYLoad) {
          scrollYStore.endIndex = scrollYStore.visibleSize
        }
        handleReserveStatus()
        tablePrivateMethods.checkSelectionStatus()
        return new Promise(resolve => {
          nextTick()
            .then(() => tableMethods.recalculate())
            .then(() => {
              let targetScrollLeft = lastScrollLeft
              let targetScrollTop = lastScrollTop
              const sXOpts = computeSXOpts.value
              const sYOpts = computeSYOpts.value
              // ??????????????????????????????????????????????????????
              if (sXOpts.scrollToLeftOnChange) {
                targetScrollLeft = 0
              }
              if (sYOpts.scrollToTopOnChange) {
                targetScrollTop = 0
              }
              // ????????????????????????
              if (oldScrollYLoad === sYLoad) {
                restoreScrollLocation($xetable, targetScrollLeft, targetScrollTop).then(resolve)
              } else {
                setTimeout(() => restoreScrollLocation($xetable, targetScrollLeft, targetScrollTop).then(resolve))
              }
            })
        })
      })
    }

    /**
     * ??????????????????????????????
     * ????????????????????????????????????
     */
    const handleLoadDefaults = () => {
      handleDefaultSelectionChecked()
      handleDefaultRadioChecked()
      handleDefaultRowExpand()
      handleDefaultTreeExpand()
      handleDefaultMergeCells()
      handleDefaultMergeFooterItems()
      nextTick(() => setTimeout(() => tableMethods.recalculate()))
    }

    /**
     * ??????????????????????????????
     * ??????????????????
     */
    const handleInitDefaults = () => {
      handleDefaultSort()
    }

    const handleTableColumn = () => {
      const { scrollXLoad } = reactData
      const { visibleColumn, scrollXStore, fullColumnIdData } = internalData
      const tableColumn = scrollXLoad ? visibleColumn.slice(scrollXStore.startIndex, scrollXStore.endIndex) : visibleColumn.slice(0)
      tableColumn.forEach((column, $index) => {
        const colid = column.id
        const rest = fullColumnIdData[colid]
        if (rest) {
          rest.$index = $index
        }
      })
      reactData.tableColumn = tableColumn
    }

    const loadScrollXData = () => {
      const { mergeList, mergeFooterList } = reactData
      const { scrollXStore } = internalData
      const { startIndex, endIndex, offsetSize } = scrollXStore
      const { toVisibleIndex, visibleSize } = computeVirtualX()
      const offsetItem = {
        startIndex: Math.max(0, toVisibleIndex - 1 - offsetSize),
        endIndex: toVisibleIndex + visibleSize + offsetSize
      }
      calculateMergerOffserIndex(mergeList.concat(mergeFooterList), offsetItem, 'col')
      const { startIndex: offsetStartIndex, endIndex: offsetEndIndex } = offsetItem
      if (toVisibleIndex <= startIndex || toVisibleIndex >= endIndex - visibleSize - 1) {
        if (startIndex !== offsetStartIndex || endIndex !== offsetEndIndex) {
          scrollXStore.startIndex = offsetStartIndex
          scrollXStore.endIndex = offsetEndIndex
          tablePrivateMethods.updateScrollXData()
        }
      }
      tableMethods.closeTooltip()
    }

    // ?????????????????????????????????
    const getColumnList = (columns: any) => {
      const result: any[] = []
      columns.forEach((column: any) => {
        result.push(...(column.children && column.children.length ? getColumnList(column.children) : [column]))
      })
      return result
    }

    const parseColumns = () => {
      const leftList: any[] = []
      const centerList: any[] = []
      const rightList: any[] = []
      const { isGroup, columnStore } = reactData
      const sXOpts = computeSXOpts.value
      const { collectColumn, tableFullColumn, scrollXStore, fullColumnIdData } = internalData
      // ????????????????????????????????????????????????????????????????????????
      if (isGroup) {
        const leftGroupList: any[] = []
        const centerGroupList: any[] = []
        const rightGroupList: any[] = []
        XEUtils.eachTree(collectColumn, (column, index, items, path, parent) => {
          const isColGroup = hasChildrenList(column)
          // ??????????????????????????????????????????????????????????????????????????????
          if (parent && parent.fixed) {
            column.fixed = parent.fixed
          }
          if (parent && column.fixed !== parent.fixed) {
            errLog('vxe.error.groupFixed')
          }
          if (isColGroup) {
            column.visible = !!XEUtils.findTree(column.children, (subColumn) => hasChildrenList(subColumn) ? false : subColumn.visible)
          } else if (column.visible) {
            if (column.fixed === 'left') {
              leftList.push(column)
            } else if (column.fixed === 'right') {
              rightList.push(column)
            } else {
              centerList.push(column)
            }
          }
        })
        collectColumn.forEach((column) => {
          if (column.visible) {
            if (column.fixed === 'left') {
              leftGroupList.push(column)
            } else if (column.fixed === 'right') {
              rightGroupList.push(column)
            } else {
              centerGroupList.push(column)
            }
          }
        })
        reactData.tableGroupColumn = leftGroupList.concat(centerGroupList).concat(rightGroupList)
      } else {
        // ???????????????
        tableFullColumn.forEach((column) => {
          if (column.visible) {
            if (column.fixed === 'left') {
              leftList.push(column)
            } else if (column.fixed === 'right') {
              rightList.push(column)
            } else {
              centerList.push(column)
            }
          }
        })
      }
      const visibleColumn = leftList.concat(centerList).concat(rightList)
      let scrollXLoad = !!sXOpts.enabled && sXOpts.gt > -1 && sXOpts.gt < tableFullColumn.length
      reactData.hasFixedColumn = leftList.length > 0 || rightList.length > 0
      Object.assign(columnStore, { leftList, centerList, rightList })
      if (scrollXLoad && isGroup) {
        scrollXLoad = false
        if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
          warnLog('vxe.error.scrollXNotGroup')
        }
      }
      if (scrollXLoad) {
        if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
          if (props.showHeader && !props.showHeaderOverflow) {
            warnLog('vxe.error.reqProp', ['show-header-overflow'])
          }
          if (props.showFooter && !props.showFooterOverflow) {
            warnLog('vxe.error.reqProp', ['show-footer-overflow'])
          }
          if (props.spanMethod) {
            warnLog('vxe.error.scrollErrProp', ['span-method'])
          }
          if (props.footerSpanMethod) {
            warnLog('vxe.error.scrollErrProp', ['footer-span-method'])
          }
        }
        const { visibleSize } = computeVirtualX()
        scrollXStore.startIndex = 0
        scrollXStore.endIndex = visibleSize
        scrollXStore.visibleSize = visibleSize
      }
      // ??????????????????/??????????????????????????????
      // ???????????????????????????????????????????????????
      if (visibleColumn.length !== internalData.visibleColumn.length || !internalData.visibleColumn.every((column, index) => column === visibleColumn[index])) {
        tableMethods.clearMergeCells()
        tableMethods.clearMergeFooterItems()
      }
      reactData.scrollXLoad = scrollXLoad
      visibleColumn.forEach((column, index) => {
        const colid = column.id
        const rest = fullColumnIdData[colid]
        if (rest) {
          rest._index = index
        }
      })
      internalData.visibleColumn = visibleColumn
      handleTableColumn()
      return tableMethods.updateFooter().then(() => {
        return tableMethods.recalculate()
      }).then(() => {
        tablePrivateMethods.updateCellAreas()
        return tableMethods.recalculate()
      })
    }

    const handleColumn = (collectColumn: any) => {
      internalData.collectColumn = collectColumn
      const tableFullColumn = getColumnList(collectColumn)
      internalData.tableFullColumn = tableFullColumn
      cacheColumnMap()
      restoreCustomStorage()
      parseColumns().then(() => {
        if (reactData.scrollXLoad) {
          loadScrollXData()
        }
      })
      tableMethods.clearMergeCells()
      tableMethods.clearMergeFooterItems()
      tablePrivateMethods.handleTableData(true)
      if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
        if ((reactData.scrollXLoad || reactData.scrollYLoad) && reactData.expandColumn) {
          warnLog('vxe.error.scrollErrProp', ['column.type=expand'])
        }
      }
      return nextTick().then(() => {
        if ($xetoolbar) {
          $xetoolbar.syncUpdate({ collectColumn, $table: $xetable })
        }
        return tableMethods.recalculate()
      })
    }

    const updateScrollYStatus = (fullData: any[]) => {
      const { treeConfig } = props
      const sYOpts = computeSYOpts.value
      const treeOpts = computeTreeOpts.value
      const { transform } = treeOpts
      const scrollYLoad = (transform || !treeConfig) && !!sYOpts.enabled && sYOpts.gt > -1 && sYOpts.gt < fullData.length
      reactData.scrollYLoad = scrollYLoad
      return scrollYLoad
    }

    /**
     * ????????????????????????
     * @param rows
     * @param expanded
     * @returns
     */
    const handleBaseTreeExpand = (rows: any[], expanded: boolean) => {
      const { treeExpandeds, treeLazyLoadeds, treeNodeColumn } = reactData
      const { fullAllDataRowIdData, tableFullData } = internalData
      const treeOpts = computeTreeOpts.value
      const { reserve, lazy, hasChild, children, accordion, toggleMethod } = treeOpts
      const result: any[] = []
      const columnIndex = tableMethods.getColumnIndex(treeNodeColumn)
      const $columnIndex = tableMethods.getVMColumnIndex(treeNodeColumn)
      let validRows = toggleMethod ? rows.filter((row: any) => toggleMethod({ $table: $xetable, expanded, column: treeNodeColumn, columnIndex, $columnIndex, row })) : rows
      if (accordion) {
        validRows = validRows.length ? [validRows[validRows.length - 1]] : []
        // ???????????????????????????
        const matchObj = XEUtils.findTree(tableFullData, item => item === validRows[0], treeOpts)
        if (matchObj) {
          XEUtils.remove(treeExpandeds, item => matchObj.items.indexOf(item) > -1)
        }
      }
      if (expanded) {
        validRows.forEach((row: any) => {
          if ($xetable.findRowIndexOf(treeExpandeds, row) === -1) {
            const rest = fullAllDataRowIdData[getRowid($xetable, row)]
            const isLoad = lazy && row[hasChild] && !rest.treeLoaded && $xetable.findRowIndexOf(treeLazyLoadeds, row) === -1
            // ?????????????????????
            if (isLoad) {
              result.push(handleAsyncTreeExpandChilds(row))
            } else {
              if (row[children] && row[children].length) {
                treeExpandeds.push(row)
              }
            }
          }
        })
      } else {
        XEUtils.remove(treeExpandeds, row => $xetable.findRowIndexOf(validRows, row) > -1)
      }
      if (reserve) {
        validRows.forEach((row: any) => handleTreeExpandReserve(row, expanded))
      }
      return Promise.all(result).then(() => {
        return tableMethods.recalculate()
      })
    }

    /**
     * ???????????????????????????
     * @param rows
     * @param expanded
     * @returns
     */
    const handleVirtualTreeExpand = (rows: any[], expanded: boolean) => {
      return handleBaseTreeExpand(rows, expanded).then(() => {
        handleVirtualTreeToList()
        return tablePrivateMethods.handleTableData()
      }).then(() => {
        return tableMethods.recalculate()
      })
    }

    /**
     * ?????? Y ??????????????????
     */
    const loadScrollYData = (evnt: Event) => {
      const { mergeList } = reactData
      const { scrollYStore } = internalData
      const { startIndex, endIndex, visibleSize, offsetSize, rowHeight } = scrollYStore
      const scrollBodyElem = (evnt.currentTarget || evnt.target) as HTMLDivElement
      const scrollTop = scrollBodyElem.scrollTop
      const toVisibleIndex = Math.floor(scrollTop / rowHeight)
      const offsetItem = {
        startIndex: Math.max(0, toVisibleIndex - 1 - offsetSize),
        endIndex: toVisibleIndex + visibleSize + offsetSize
      }
      calculateMergerOffserIndex(mergeList, offsetItem, 'row')
      const { startIndex: offsetStartIndex, endIndex: offsetEndIndex } = offsetItem
      if (toVisibleIndex <= startIndex || toVisibleIndex >= endIndex - visibleSize - 1) {
        if (startIndex !== offsetStartIndex || endIndex !== offsetEndIndex) {
          scrollYStore.startIndex = offsetStartIndex
          scrollYStore.endIndex = offsetEndIndex
          tablePrivateMethods.updateScrollYData()
        }
      }
    }

    const createGetRowCacheProp = (prop: 'seq' | 'index' | '_index' | '$index') => {
      return function (row: any) {
        const { fullAllDataRowIdData } = internalData
        if (row) {
          const rowid = getRowid($xetable, row)
          const rest = fullAllDataRowIdData[rowid]
          if (rest) {
            return rest[prop]
          }
        }
        return -1
      }
    }

    const createGetColumnCacheProp = (prop: 'index' | '_index' | '$index') => {
      return function (column: VxeTableDefines.ColumnInfo) {
        const { fullColumnIdData } = internalData
        if (column) {
          const rest = fullColumnIdData[column.id]
          if (rest) {
            return rest[prop]
          }
        }
        return -1
      }
    }

    const debounceScrollY = XEUtils.debounce(function (evnt: Event) {
      loadScrollYData(evnt)
    }, 20, { leading: false, trailing: true })

    let keyCtxTimeout: any

    tableMethods = {
      dispatchEvent (type, params, evnt) {
        emit(type, Object.assign({ $table: $xetable, $event: evnt }, params))
      },
      /**
       * ?????????????????????????????????
       */
      clearAll () {
        return clearTableAllStatus($xetable)
      },
      /**
       * ?????? data ????????????????????????
       * ??????????????????????????????????????????????????????????????????????????????????????????????????????
       * ???????????????????????????????????????????????????????????????????????????????????????
       */
      syncData () {
        return nextTick().then(() => {
          reactData.tableData = []
          emit('update:data', internalData.tableFullData)
          return nextTick()
        })
      },
      /**
       * ????????????????????????????????????????????????
       * ????????????????????????????????????...??????????????????????????????????????????????????????
       */
      updateData () {
        const { scrollXLoad, scrollYLoad } = reactData
        return tablePrivateMethods.handleTableData(true).then(() => {
          tableMethods.updateFooter()
          if (scrollXLoad || scrollYLoad) {
            if (scrollXLoad) {
              tablePrivateMethods.updateScrollXSpace()
            }
            if (scrollYLoad) {
              tablePrivateMethods.updateScrollYSpace()
            }
            return tableMethods.refreshScroll()
          }
        }).then(() => {
          tablePrivateMethods.updateCellAreas()
          return tableMethods.recalculate(true)
        }).then(() => {
          // ?????????????????????????????????
          setTimeout(() => $xetable.recalculate(), 50)
        })
      },
      /**
       * ?????????????????????????????????????????????
       * @param {Array} datas ??????
       */
      loadData (datas) {
        const { inited, initStatus } = internalData
        return loadTableData(datas).then(() => {
          internalData.inited = true
          internalData.initStatus = true
          if (!initStatus) {
            handleLoadDefaults()
          }
          if (!inited) {
            handleInitDefaults()
          }
          return tableMethods.recalculate()
        })
      },
      /**
       * ??????????????????????????????????????????
       * @param {Array} datas ??????
       */
      reloadData (datas) {
        const { inited } = internalData
        return tableMethods.clearAll()
          .then(() => {
            internalData.inited = true
            internalData.initStatus = true
            return loadTableData(datas)
          })
          .then(() => {
            handleLoadDefaults()
            if (!inited) {
              handleInitDefaults()
            }
            return tableMethods.recalculate()
          })
      },
      /**
       * ?????????????????????????????????????????????
       * ????????????????????????????????????????????????????????????
       * @param {Row} row ?????????
       * @param {Object} record ?????????
       * @param {String} field ?????????
       */
      reloadRow (row, record, field?: string) {
        const { keepSource } = props
        const { tableData } = reactData
        const { tableSourceData } = internalData
        if (keepSource) {
          const rowIndex = tableMethods.getRowIndex(row)
          const oRow = tableSourceData[rowIndex]
          if (oRow && row) {
            if (field) {
              const newValue = XEUtils.get(record || row, field)
              XEUtils.set(row, field, newValue)
              XEUtils.set(oRow, field, newValue)
            } else {
              const newRecord = XEUtils.clone({ ...record }, true)
              XEUtils.destructuring(oRow, Object.assign(row, newRecord))
            }
          }
          reactData.tableData = tableData.slice(0)
        } else {
          if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
            warnLog('vxe.error.reqProp', ['keep-source'])
          }
        }
        return nextTick()
      },
      /**
       * ?????????????????????????????????????????????
       */
      loadTreeChildren (row, childRecords) {
        const { keepSource } = props
        const { tableSourceData, fullDataRowIdData, fullAllDataRowIdData } = internalData
        const treeOpts = computeTreeOpts.value
        const { transform, children, mapChildren } = treeOpts
        const parentRest = fullAllDataRowIdData[getRowid($xetable, row)]
        const parentLevel = parentRest ? parentRest.level : 0
        return tableMethods.createData(childRecords).then((rows) => {
          if (keepSource) {
            const rowid = getRowid($xetable, row)
            const matchObj = XEUtils.findTree(tableSourceData, (item) => rowid === getRowid($xetable, item), treeOpts)
            if (matchObj) {
              matchObj.item[children] = XEUtils.clone(rows, true)
            }
          }
          XEUtils.eachTree(rows, (childRow, index, items, path, parent, nodes) => {
            const rowid = getRowid($xetable, childRow)
            const rest = { row: childRow, rowid, seq: -1, index, _index: -1, $index: -1, items, parent, level: parentLevel + nodes.length }
            fullDataRowIdData[rowid] = rest
            fullAllDataRowIdData[rowid] = rest
          }, treeOpts)
          row[children] = rows
          if (transform) {
            row[mapChildren] = rows
          }
          updateAfterDataIndex()
          return rows
        })
      },
      /**
       * ???????????????
       * ??????????????????????????????????????????????????????????????????
       * @param {ColumnInfo} columns ?????????
       */
      loadColumn (columns) {
        const collectColumn = XEUtils.mapTree(columns, column => reactive(Cell.createColumn($xetable, column)))
        return handleColumn(collectColumn)
      },
      /**
       * ???????????????????????????????????????
       * ??????????????????????????????????????????????????????????????????
       * @param {ColumnInfo} columns ?????????
       */
      reloadColumn (columns) {
        return tableMethods.clearAll().then(() => {
          return tableMethods.loadColumn(columns)
        })
      },
      /**
       * ?????? tr ????????????????????? row ??????
       * @param {Element} tr ??????
       */
      getRowNode (tr) {
        if (tr) {
          const { fullAllDataRowIdData } = internalData
          const rowid = tr.getAttribute('rowid')
          if (rowid) {
            const rest = fullAllDataRowIdData[rowid]
            if (rest) {
              return { rowid: rest.rowid, item: rest.row, index: rest.index, items: rest.items, parent: rest.parent }
            }
          }
        }
        return null
      },
      /**
       * ?????? th/td ????????????????????? column ??????
       * @param {Element} cell ??????
       */
      getColumnNode (cell) {
        if (cell) {
          const { fullColumnIdData } = internalData
          const colid = cell.getAttribute('colid')
          if (colid) {
            const rest = fullColumnIdData[colid]
            if (rest) {
              return { colid: rest.colid, item: rest.column, index: rest.index, items: rest.items, parent: rest.parent }
            }
          }
        }
        return null
      },
      /**
       * ?????? row ????????????
       * @param {Row} row ?????????
       */
      getRowSeq: createGetRowCacheProp('seq'),
      /**
       * ?????? row ??????????????? data ????????????
       * @param {Row} row ?????????
       */
      getRowIndex: createGetRowCacheProp('index') as ((row: any) => number),
      /**
       * ?????? row ???????????????????????????????????????
       * @param {Row} row ?????????
       */
      getVTRowIndex: createGetRowCacheProp('_index') as ((row: any) => number),
      /**
       * ?????? row ??????????????????????????????
       * @param {Row} row ?????????
       */
      getVMRowIndex: createGetRowCacheProp('$index') as ((row: any) => number),
      /**
       * ?????? column ??????????????? columns ????????????
       * @param {ColumnInfo} column ?????????
       */
      getColumnIndex: createGetColumnCacheProp('index'),
      /**
       * ?????? column ??????????????????????????????????????????
       * @param {ColumnInfo} column ?????????
       */
      getVTColumnIndex: createGetColumnCacheProp('_index'),
      /**
       * ?????? column ??????????????????????????????
       * @param {ColumnInfo} column ?????????
       */
      getVMColumnIndex: createGetColumnCacheProp('$index'),
      /**
       * ?????? data ??????
       * ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
       * @param {Array} records ?????????
       */
      createData (records) {
        const { treeConfig } = props
        const treeOpts = computeTreeOpts.value
        const handleRrecord = (record: any) => reactive(tablePrivateMethods.defineField(record || {}))
        const rows = treeConfig ? XEUtils.mapTree(records, handleRrecord, treeOpts) : records.map(handleRrecord)
        return nextTick().then(() => rows)
      },
      /**
       * ?????? Row|Rows ??????
       * ???????????????????????????????????????????????????????????????????????????
       * @param {Array/Object} records ?????????
       */
      createRow (records) {
        const isArr = XEUtils.isArray(records)
        if (!isArr) {
          records = [records]
        }
        return nextTick().then(() => tableMethods.createData(records).then((rows) => isArr ? rows : rows[0]))
      },
      /**
       * ????????????
       * ????????????????????????????????????????????????
       * ????????? row ???????????????
       * ????????? rows ???????????????
       * ????????????????????? field ?????????????????????????????????
       */
      revertData (rows: any, field) {
        const { keepSource } = props
        const { tableSourceData, tableFullData } = internalData
        if (!keepSource) {
          if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
            warnLog('vxe.error.reqProp', ['keep-source'])
          }
          return nextTick()
        }
        let targetRows = rows
        if (rows) {
          if (!XEUtils.isArray(rows)) {
            targetRows = [rows]
          }
        } else {
          targetRows = XEUtils.toArray($xetable.getUpdateRecords())
        }
        if (targetRows.length) {
          targetRows.forEach((row: any) => {
            if (!tableMethods.isInsertByRow(row)) {
              const rowIndex = $xetable.findRowIndexOf(tableFullData, row)
              const oRow = tableSourceData[rowIndex]
              if (oRow && row) {
                if (field) {
                  XEUtils.set(row, field, XEUtils.clone(XEUtils.get(oRow, field), true))
                } else {
                  XEUtils.destructuring(row, XEUtils.clone(oRow, true))
                }
              }
            }
          })
        }
        if (rows) {
          return nextTick()
        }
        return tableMethods.reloadData(tableSourceData)
      },
      /**
       * ?????????????????????
       * ????????????????????????????????????????????????
       * ????????? row ?????????????????????
       * ????????? rows ?????????????????????
       * ????????????????????? field ??????????????????????????????
       * @param {Array/Row} rows ?????????
       * @param {String} field ?????????
       */
      clearData (rows: any, field: any) {
        const { tableFullData, visibleColumn } = internalData
        if (!arguments.length) {
          rows = tableFullData
        } else if (rows && !XEUtils.isArray(rows)) {
          rows = [rows]
        }
        if (field) {
          rows.forEach((row: any) => XEUtils.set(row, field, null))
        } else {
          rows.forEach((row: any) => {
            visibleColumn.forEach((column) => {
              if (column.field) {
                setCellValue(row, column, null)
              }
            })
          })
        }
        return nextTick()
      },
      /**
       * ??????????????????????????????
       * @param {Row} row ?????????
       */
      isInsertByRow (row) {
        const { editStore } = reactData
        return $xetable.findRowIndexOf(editStore.insertList, row) > -1
      },
      /**
       * ?????????????????????????????????
       * @returns
       */
      removeInsertRow () {
        const { editStore } = reactData
        return $xetable.remove(editStore.insertList)
      },
      /**
       * ???????????????????????????????????????
       * @param {Row} row ?????????
       * @param {String} field ?????????
       */
      isUpdateByRow (row, field) {
        const { keepSource, treeConfig } = props
        const { visibleColumn, tableSourceData, fullDataRowIdData } = internalData
        const treeOpts = computeTreeOpts.value
        if (keepSource) {
          let oRow, property
          const rowid = getRowid($xetable, row)
          // ??????????????????????????????
          if (!fullDataRowIdData[rowid]) {
            return false
          }
          if (treeConfig) {
            const children = treeOpts.children
            const matchObj = XEUtils.findTree(tableSourceData, item => rowid === getRowid($xetable, item), treeOpts)
            row = Object.assign({}, row, { [children]: null })
            if (matchObj) {
              oRow = Object.assign({}, matchObj.item, { [children]: null })
            }
          } else {
            const oRowIndex = fullDataRowIdData[rowid].index
            oRow = tableSourceData[oRowIndex]
          }
          if (oRow) {
            if (arguments.length > 1) {
              return !eqCellValue(oRow, row, field as string)
            }
            for (let index = 0, len = visibleColumn.length; index < len; index++) {
              property = visibleColumn[index].field
              if (property && !eqCellValue(oRow, row, property)) {
                return true
              }
            }
          }
        }
        return false
      },
      /**
       * ?????????????????????????????????????????????????????????
       * @param {Number} columnIndex ??????
       */
      getColumns (columnIndex?: number): any {
        const columns = internalData.visibleColumn
        return XEUtils.isUndefined(columnIndex) ? columns.slice(0) : columns[columnIndex]
      },
      /**
       * ?????????????????????????????????
       * @param {String} colid ?????????
       */
      getColumnById (colid) {
        const fullColumnIdData = internalData.fullColumnIdData
        return fullColumnIdData[colid] ? fullColumnIdData[colid].column : null
      },
      /**
       * ??????????????????????????????
       * @param {String} field ?????????
       */
      getColumnByField (field) {
        const fullColumnFieldData = internalData.fullColumnFieldData
        return fullColumnFieldData[field] ? fullColumnFieldData[field].column : null
      },
      /**
       * ????????????????????????
       * ????????????????????????????????????????????????????????????????????????????????????????????????????????????
       */
      getTableColumn () {
        return {
          collectColumn: internalData.collectColumn.slice(0),
          fullColumn: internalData.tableFullColumn.slice(0),
          visibleColumn: internalData.visibleColumn.slice(0),
          tableColumn: reactData.tableColumn.slice(0)
        }
      },
      /**
       * ?????????????????? data ???????????????????????????????????????????????????
       */
      getData (rowIndex?: number) {
        const tableSynchData = props.data || internalData.tableSynchData
        return XEUtils.isUndefined(rowIndex) ? tableSynchData.slice(0) : tableSynchData[rowIndex]
      },
      /**
       * ??????????????????????????????????????????
       */
      getCheckboxRecords (isFull) {
        const { treeConfig } = props
        const { tableFullData, afterFullData, afterTreeFullData, tableFullTreeData } = internalData
        const treeOpts = computeTreeOpts.value
        const checkboxOpts = computeCheckboxOpts.value
        const { transform, children, mapChildren } = treeOpts
        const { checkField } = checkboxOpts
        let rowList = []
        const currTableData = isFull ? (transform ? tableFullTreeData : tableFullData) : (transform ? afterTreeFullData : afterFullData)
        if (checkField) {
          if (treeConfig) {
            rowList = XEUtils.filterTree(currTableData, row => XEUtils.get(row, checkField), { children: transform ? mapChildren : children })
          } else {
            rowList = currTableData.filter((row) => XEUtils.get(row, checkField))
          }
        } else {
          const { selection } = reactData
          if (treeConfig) {
            rowList = XEUtils.filterTree(currTableData, row => $xetable.findRowIndexOf(selection, row) > -1, { children: transform ? mapChildren : children })
          } else {
            rowList = currTableData.filter((row) => $xetable.findRowIndexOf(selection, row) > -1)
          }
        }
        return rowList
      },
      /**
       * ?????? tree-config ???????????????????????????
       */
      getParentRow (rowOrRowid) {
        const { treeConfig } = props
        const { fullDataRowIdData } = internalData
        if (rowOrRowid && treeConfig) {
          let rowid
          if (XEUtils.isString(rowOrRowid)) {
            rowid = rowOrRowid
          } else {
            rowid = getRowid($xetable, rowOrRowid)
          }
          if (rowid) {
            return fullDataRowIdData[rowid] ? fullDataRowIdData[rowid].parent : null
          }
        }
        return null
      },
      /**
       * ?????????????????????????????????
       * @param {String/Number} rowid ?????????
       */
      getRowById (cellValue) {
        const { fullDataRowIdData } = internalData
        const rowid = XEUtils.eqNull(cellValue) ? '' : encodeURIComponent(cellValue)
        return fullDataRowIdData[rowid] ? fullDataRowIdData[rowid].row : null
      },
      /**
       * ?????????????????????????????????
       * @param {Row} row ?????????
       */
      getRowid (row) {
        return getRowid($xetable, row)
      },
      /**
       * ??????????????????????????????
       * ???????????????????????????????????????
       * ?????????????????????????????????
       */
      getTableData () {
        const { tableData, footerTableData } = reactData
        const { tableFullData, afterFullData } = internalData
        return {
          fullData: tableFullData.slice(0),
          visibleData: afterFullData.slice(0),
          tableData: tableData.slice(0),
          footerData: footerTableData.slice(0)
        }
      },
      /**
       * ???????????????
       */
      hideColumn (fieldOrColumn) {
        const column = handleFieldOrColumn($xetable, fieldOrColumn)
        if (column) {
          column.visible = false
        }
        return tablePrivateMethods.handleCustom()
      },
      /**
       * ???????????????
       */
      showColumn (fieldOrColumn) {
        const column = handleFieldOrColumn($xetable, fieldOrColumn)
        if (column) {
          column.visible = true
        }
        return tablePrivateMethods.handleCustom()
      },
      /**
       * ?????????????????????????????????????????????????????????
       * ????????? true ?????????????????????
       * ?????????????????????????????????????????????
       */
      resetColumn (options) {
        const { tableFullColumn } = internalData
        const customOpts = computeCustomOpts.value
        const { checkMethod } = customOpts
        const opts = Object.assign({ visible: true, resizable: options === true }, options)
        tableFullColumn.forEach((column) => {
          if (opts.resizable) {
            column.resizeWidth = 0
          }
          if (!checkMethod || checkMethod({ column })) {
            column.visible = column.defaultVisible
          }
        })
        if (opts.resizable) {
          tablePrivateMethods.saveCustomResizable(true)
        }
        return tablePrivateMethods.handleCustom()
      },
      /**
       * ???????????????
       * ??????????????????????????????????????????
       */
      refreshColumn () {
        return parseColumns().then(() => {
          return tableMethods.refreshScroll()
        }).then(() => {
          return tableMethods.recalculate()
        })
      },
      /**
       * ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
       */
      refreshScroll () {
        const { lastScrollLeft, lastScrollTop } = internalData
        const tableBody = refTableBody.value
        const tableFooter = refTableFooter.value
        const leftBody = refTableLeftBody.value
        const rightBody = refTableRightBody.value
        const tableBodyElem = tableBody ? tableBody.$el as HTMLDivElement : null
        const leftBodyElem = leftBody ? leftBody.$el as HTMLDivElement : null
        const rightBodyElem = rightBody ? rightBody.$el as HTMLDivElement : null
        const tableFooterElem = tableFooter ? tableFooter.$el as HTMLDivElement : null
        return new Promise(resolve => {
          // ?????????????????????
          if (lastScrollLeft || lastScrollTop) {
            return restoreScrollLocation($xetable, lastScrollLeft, lastScrollTop).then(resolve).then(() => {
              // ?????????????????????????????????
              setTimeout(resolve, 30)
            })
          }
          // ??????
          setScrollTop(tableBodyElem, lastScrollTop)
          setScrollTop(leftBodyElem, lastScrollTop)
          setScrollTop(rightBodyElem, lastScrollTop)
          setScrollLeft(tableFooterElem, lastScrollLeft)
          // ?????????????????????????????????
          setTimeout(resolve, 30)
        })
      },
      /**
       * ??????????????????????????????????????????????????????
       * ?????? width=? width=?px width=?% min-width=? min-width=?px min-width=?%
       */
      recalculate (refull?: boolean) {
        autoCellWidth()
        if (refull === true) {
          // ????????????????????????????????????????????????????????????????????????????????????
          return computeScrollLoad().then(() => {
            autoCellWidth()
            return computeScrollLoad()
          })
        }
        return computeScrollLoad()
      },
      openTooltip (target, content) {
        const $commTip = refCommTooltip.value
        if ($commTip) {
          return $commTip.open(target, content)
        }
        return nextTick()
      },
      /**
       * ?????? tooltip
       */
      closeTooltip () {
        const { tooltipStore } = reactData
        const $tooltip = refTooltip.value
        const $commTip = refCommTooltip.value
        if (tooltipStore.visible) {
          Object.assign(tooltipStore, {
            row: null,
            column: null,
            content: null,
            visible: false
          })
          if ($tooltip) {
            $tooltip.close()
          }
        }
        if ($commTip) {
          $commTip.close()
        }
        return nextTick()
      },
      /**
       * ????????????????????????????????????
       */
      isAllCheckboxChecked () {
        return reactData.isAllSelected
      },
      /**
       * ????????????????????????????????????
       */
      isAllCheckboxIndeterminate () {
        return !reactData.isAllSelected && reactData.isIndeterminate
      },
      /**
       * ???????????????????????????????????????
       */
      getCheckboxIndeterminateRecords (isFull) {
        const { treeConfig } = props
        const { afterFullData } = internalData
        const { treeIndeterminates } = reactData
        if (treeConfig) {
          return isFull ? treeIndeterminates.slice(0) : treeIndeterminates.filter(row => $xetable.findRowIndexOf(afterFullData, row) > -1)
        }
        return []
      },
      /**
       * ???????????????????????????????????????????????????????????????????????????
       * @param {Array/Row} rows ?????????
       * @param {Boolean} value ????????????
       */
      setCheckboxRow (rows, value) {
        if (rows && !XEUtils.isArray(rows)) {
          rows = [rows]
        }
        (rows as any[]).forEach((row) => tablePrivateMethods.handleSelectRow({ row }, !!value))
        return nextTick()
      },
      isCheckedByCheckboxRow (row) {
        const { selection } = reactData
        const checkboxOpts = computeCheckboxOpts.value
        const { checkField } = checkboxOpts
        if (checkField) {
          return XEUtils.get(row, checkField)
        }
        return $xetable.findRowIndexOf(selection, row) > -1
      },
      isIndeterminateByCheckboxRow (row) {
        const { treeIndeterminates } = reactData
        return $xetable.findRowIndexOf(treeIndeterminates, row) > -1 && !tableMethods.isCheckedByCheckboxRow(row)
      },
      /**
       * ???????????????????????????????????????
       */
      toggleCheckboxRow (row) {
        tablePrivateMethods.handleToggleCheckRowEvent(null, { row })
        return nextTick()
      },
      /**
       * ????????????????????????????????????????????????
       * @param {Boolean} value ????????????
       */
      setAllCheckboxRow (value) {
        const { treeConfig } = props
        const { selection } = reactData
        const { afterFullData, checkboxReserveRowMap } = internalData
        const treeOpts = computeTreeOpts.value
        const checkboxOpts = computeCheckboxOpts.value
        const { checkField, reserve, checkStrictly, checkMethod } = checkboxOpts
        let selectRows: any[] = []
        const beforeSelection = treeConfig ? [] : selection.filter((row) => $xetable.findRowIndexOf(afterFullData, row) === -1)
        if (checkStrictly) {
          reactData.isAllSelected = value
        } else {
          /**
           * ?????????????????????????????????????????????
           * ????????????????????????????????????????????????????????????
           */
          if (checkField) {
            const checkValFn = (row: any) => {
              if (!checkMethod || checkMethod({ row })) {
                if (value) {
                  selectRows.push(row)
                }
                XEUtils.set(row, checkField, value)
              }
            }
            // ????????????????????????
            // ?????????????????????????????????????????????????????????
            if (treeConfig) {
              XEUtils.eachTree(afterFullData, checkValFn, treeOpts)
            } else {
              afterFullData.forEach(checkValFn)
            }
          } else {
            /**
             * ???????????????????????????????????????
             * ?????????????????????????????????
             */
            if (treeConfig) {
              if (value) {
                /**
                 * ??????????????????
                 * ????????????????????????????????????????????????
                 */
                XEUtils.eachTree(afterFullData, (row) => {
                  if (!checkMethod || checkMethod({ row })) {
                    selectRows.push(row)
                  }
                }, treeOpts)
              } else {
                /**
                 * ??????????????????
                 * ???????????????????????????????????????????????????
                 */
                if (checkMethod) {
                  XEUtils.eachTree(afterFullData, (row) => {
                    if (checkMethod({ row }) ? 0 : $xetable.findRowIndexOf(selection, row) > -1) {
                      selectRows.push(row)
                    }
                  }, treeOpts)
                }
              }
            } else {
              if (value) {
                /**
                 * ??????????????????
                 * ????????????????????????????????????????????????????????????????????????????????????
                 * ?????????????????????????????????????????????????????????????????????
                 */
                if (checkMethod) {
                  selectRows = afterFullData.filter((row) => $xetable.findRowIndexOf(selection, row) > -1 || checkMethod({ row }))
                } else {
                  selectRows = afterFullData.slice(0)
                }
              } else {
                /**
                 * ??????????????????
                 * ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
                 * ?????????????????????????????????????????????????????????????????????
                 */
                if (checkMethod) {
                  selectRows = afterFullData.filter((row) => checkMethod({ row }) ? 0 : $xetable.findRowIndexOf(selection, row) > -1)
                }
              }
            }
          }
          if (reserve) {
            if (value) {
              selectRows.forEach((row) => {
                checkboxReserveRowMap[getRowid($xetable, row)] = row
              })
            } else {
              afterFullData.forEach((row) => handleCheckboxReserveRow(row, false))
            }
          }
          reactData.selection = checkField ? [] : beforeSelection.concat(selectRows)
        }
        reactData.treeIndeterminates = []
        tablePrivateMethods.checkSelectionStatus()
        return nextTick()
      },
      /**
       * ?????????????????????????????????
       */
      getRadioReserveRecord (isFull) {
        const { treeConfig } = props
        const { fullDataRowIdData, radioReserveRow, afterFullData } = internalData
        const radioOpts = computeRadioOpts.value
        const treeOpts = computeTreeOpts.value
        if (radioOpts.reserve && radioReserveRow) {
          const rowid = getRowid($xetable, radioReserveRow)
          if (isFull) {
            if (!fullDataRowIdData[rowid]) {
              return radioReserveRow
            }
          } else {
            const rowkey = getRowkey($xetable)
            if (treeConfig) {
              const matchObj = XEUtils.findTree(afterFullData, row => rowid === XEUtils.get(row, rowkey), treeOpts)
              if (matchObj) {
                return radioReserveRow
              }
            } else {
              if (!afterFullData.some(row => rowid === XEUtils.get(row, rowkey))) {
                return radioReserveRow
              }
            }
          }
        }
        return null
      },
      clearRadioReserve () {
        internalData.radioReserveRow = null
        return nextTick()
      },
      /**
       * ?????????????????????????????????
       */
      getCheckboxReserveRecords (isFull) {
        const { treeConfig } = props
        const { afterFullData, fullDataRowIdData, checkboxReserveRowMap } = internalData
        const checkboxOpts = computeCheckboxOpts.value
        const treeOpts = computeTreeOpts.value
        const reserveSelection: any[] = []
        if (checkboxOpts.reserve) {
          const afterFullIdMaps: { [key: string]: number } = {}
          if (treeConfig) {
            XEUtils.eachTree(afterFullData, row => {
              afterFullIdMaps[getRowid($xetable, row)] = 1
            }, treeOpts)
          } else {
            afterFullData.forEach(row => {
              afterFullIdMaps[getRowid($xetable, row)] = 1
            })
          }
          XEUtils.each(checkboxReserveRowMap, (oldRow, oldRowid) => {
            if (oldRow) {
              if (isFull) {
                if (!fullDataRowIdData[oldRowid]) {
                  reserveSelection.push(oldRow)
                }
              } else {
                if (!afterFullIdMaps[oldRowid]) {
                  reserveSelection.push(oldRow)
                }
              }
            }
          })
        }
        return reserveSelection
      },
      clearCheckboxReserve () {
        internalData.checkboxReserveRowMap = {}
        return nextTick()
      },
      /**
       * ???????????????????????????????????????
       */
      toggleAllCheckboxRow () {
        tablePrivateMethods.triggerCheckAllEvent(null, !reactData.isAllSelected)
        return nextTick()
      },
      /**
       * ?????????????????????????????????????????????
       * ????????????????????????????????????????????????????????????????????????????????????
       */
      clearCheckboxRow () {
        const { treeConfig } = props
        const { tableFullData } = internalData
        const treeOpts = computeTreeOpts.value
        const checkboxOpts = computeCheckboxOpts.value
        const { checkField, reserve } = checkboxOpts
        if (checkField) {
          if (treeConfig) {
            XEUtils.eachTree(tableFullData, item => XEUtils.set(item, checkField, false), treeOpts)
          } else {
            tableFullData.forEach((item) => XEUtils.set(item, checkField, false))
          }
        }
        if (reserve) {
          tableFullData.forEach((row) => handleCheckboxReserveRow(row, false))
        }
        reactData.isAllSelected = false
        reactData.isIndeterminate = false
        reactData.selection = []
        reactData.treeIndeterminates = []
        return nextTick()
      },
      /**
       * ????????????????????????????????????????????????
       * @param {Row} row ?????????
       */
      setCurrentRow (row) {
        const rowOpts = computeRowOpts.value
        const el = refElem.value
        tableMethods.clearCurrentRow()
        tableMethods.clearCurrentColumn()
        reactData.currentRow = row
        if (rowOpts.isCurrent || props.highlightCurrentRow) {
          if (el) {
            XEUtils.arrayEach(el.querySelectorAll(`[rowid="${getRowid($xetable, row)}"]`), elem => addClass(elem, 'row--current'))
          }
        }
        return nextTick()
      },
      isCheckedByRadioRow (row) {
        return $xetable.eqRow(reactData.selectRow, row)
      },
      /**
       * ????????????????????????????????????????????????
       * @param {Row} row ?????????
       */
      setRadioRow (row) {
        const radioOpts = computeRadioOpts.value
        const { checkMethod } = radioOpts
        if (row && (!checkMethod || checkMethod({ row }))) {
          reactData.selectRow = row
          handleRadioReserveRow(row)
        }
        return nextTick()
      },
      /**
       * ???????????????????????????????????????????????????
       */
      clearCurrentRow () {
        const el = refElem.value
        reactData.currentRow = null
        internalData.hoverRow = null
        if (el) {
          XEUtils.arrayEach(el.querySelectorAll('.row--current'), elem => removeClass(elem, 'row--current'))
        }
        return nextTick()
      },
      /**
       * ?????????????????????????????????????????????
       */
      clearRadioRow () {
        reactData.selectRow = null
        return nextTick()
      },
      /**
       * ??????????????????????????????????????????
       */
      getCurrentRecord () {
        const rowOpts = computeRowOpts.value
        return rowOpts.isCurrent || props.highlightCurrentRow ? reactData.currentRow : null
      },
      /**
       * ?????????????????????????????????????????????
       */
      getRadioRecord (isFull) {
        const { treeConfig } = props
        const { fullDataRowIdData, afterFullData } = internalData
        const { selectRow } = reactData
        const treeOpts = computeTreeOpts.value
        if (selectRow) {
          const rowid = getRowid($xetable, selectRow)
          if (isFull) {
            if (!fullDataRowIdData[rowid]) {
              return selectRow
            }
          } else {
            if (treeConfig) {
              const rowkey = getRowkey($xetable)
              const matchObj = XEUtils.findTree(afterFullData, row => rowid === XEUtils.get(row, rowkey), treeOpts)
              if (matchObj) {
                return selectRow
              }
            } else {
              if ($xetable.findRowIndexOf(afterFullData, selectRow) > -1) {
                return selectRow
              }
            }
          }
        }
        return null
      },
      getCurrentColumn () {
        const columnOpts = computeColumnOpts.value
        return columnOpts.isCurrent || props.highlightCurrentColumn ? reactData.currentColumn : null
      },
      /**
       * ????????????????????????????????????????????????
       */
      setCurrentColumn (fieldOrColumn) {
        const column = handleFieldOrColumn($xetable, fieldOrColumn)
        if (column) {
          tableMethods.clearCurrentRow()
          tableMethods.clearCurrentColumn()
          reactData.currentColumn = column
        }
        return nextTick()
      },
      /**
       * ???????????????????????????????????????????????????
       */
      clearCurrentColumn () {
        reactData.currentColumn = null
        return nextTick()
      },
      sort (sortConfs: any, sortOrder?: any) {
        const sortOpts = computeSortOpts.value
        const { multiple, remote, orders } = sortOpts
        if (sortConfs) {
          if (XEUtils.isString(sortConfs)) {
            sortConfs = [
              { field: sortConfs, order: sortOrder }
            ]
          }
        }
        if (!XEUtils.isArray(sortConfs)) {
          sortConfs = [sortConfs]
        }
        if (sortConfs.length) {
          if (!multiple) {
            clearAllSort()
          }
          (multiple ? sortConfs : [sortConfs[0]]).forEach((confs: any, index: number) => {
            let { field, order } = confs
            let column = field
            if (XEUtils.isString(field)) {
              column = tableMethods.getColumnByField(field)
            }
            if (column && column.sortable) {
              if (orders.indexOf(order) === -1) {
                order = getNextSortOrder(column)
              }
              if (column.order !== order) {
                column.order = order
              }
              column.sortTime = Date.now() + index
            }
          })
          // ??????????????????????????????????????????????????????
          if (!remote) {
            tablePrivateMethods.handleTableData(true)
          }
          return nextTick().then(updateStyle)
        }
        return nextTick()
      },
      /**
       * ??????????????????????????????
       * ?????????????????????????????????????????????
       * @param {String} fieldOrColumn ???????????????
       */
      clearSort (fieldOrColumn) {
        const sortOpts = computeSortOpts.value
        if (fieldOrColumn) {
          const column = handleFieldOrColumn($xetable, fieldOrColumn)
          if (column) {
            column.order = null
          }
        } else {
          clearAllSort()
        }
        if (!sortOpts.remote) {
          tablePrivateMethods.handleTableData(true)
        }
        return nextTick().then(updateStyle)
      },
      isSort (fieldOrColumn) {
        if (fieldOrColumn) {
          const column = handleFieldOrColumn($xetable, fieldOrColumn)
          return column ? column.sortable && !!column.order : false
        }
        return tableMethods.getSortColumns().length > 0
      },
      getSortColumns () {
        const sortOpts = computeSortOpts.value
        const { multiple, chronological } = sortOpts
        const sortList: VxeTableDefines.SortCheckedParams[] = []
        const { tableFullColumn } = internalData
        tableFullColumn.forEach((column) => {
          const { field, order } = column
          if (column.sortable && order) {
            sortList.push({ column, field, property: field, order, sortTime: column.sortTime })
          }
        })
        if (multiple && chronological && sortList.length > 1) {
          return XEUtils.orderBy(sortList, 'sortTime')
        }
        return sortList
      },
      /**
       * ????????????
       * @param {Event} evnt ??????
       */
      closeFilter () {
        const { filterStore } = reactData
        const { column, visible } = filterStore
        Object.assign(filterStore, {
          isAllSelected: false,
          isIndeterminate: false,
          options: [],
          visible: false
        })
        if (visible) {
          $xetable.dispatchEvent('filter-visible', { column, property: column.field, field: column.field, filterList: $xetable.getCheckedFilters(), visible: false }, null)
        }
        return nextTick()
      },
      /**
       * ?????????????????????????????????????????????????????????????????????
       * @param {String} fieldOrColumn ?????????
       */
      isFilter (fieldOrColumn) {
        const column = handleFieldOrColumn($xetable, fieldOrColumn)
        if (column) {
          return column.filters && column.filters.some((option) => option.checked)
        }
        return $xetable.getCheckedFilters().length > 0
      },
      /**
       * ????????????????????????????????????
       * @param {Row} row ?????????
       */
      isRowExpandLoaded (row) {
        const { fullAllDataRowIdData } = internalData
        const rest = fullAllDataRowIdData[getRowid($xetable, row)]
        return rest && !!rest.expandLoaded
      },
      clearRowExpandLoaded (row) {
        const { expandLazyLoadeds } = reactData
        const { fullAllDataRowIdData } = internalData
        const expandOpts = computeExpandOpts.value
        const { lazy } = expandOpts
        const rest = fullAllDataRowIdData[getRowid($xetable, row)]
        if (lazy && rest) {
          rest.expandLoaded = false
          XEUtils.remove(expandLazyLoadeds, item => $xetable.eqRow(item, row))
        }
        return nextTick()
      },
      /**
       * ??????????????????????????????????????????
       * @param {Row} row ?????????
       */
      reloadRowExpand (row) {
        const { expandLazyLoadeds } = reactData
        const expandOpts = computeExpandOpts.value
        const { lazy } = expandOpts
        if (lazy && $xetable.findRowIndexOf(expandLazyLoadeds, row) === -1) {
          tableMethods.clearRowExpandLoaded(row)
            .then(() => handleAsyncRowExpand(row))
        }
        return nextTick()
      },
      reloadExpandContent (row) {
        if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
          warnLog('vxe.error.delFunc', ['reloadExpandContent', 'reloadRowExpand'])
        }
        // ????????????
        return tableMethods.reloadRowExpand(row)
      },
      /**
       * ???????????????
       */
      toggleRowExpand (row) {
        return tableMethods.setRowExpand(row, !tableMethods.isExpandByRow(row))
      },
      /**
       * ??????????????????????????????
       * @param {Boolean} expanded ????????????
       */
      setAllRowExpand (expanded) {
        const expandOpts = computeExpandOpts.value
        return tableMethods.setRowExpand(expandOpts.lazy ? reactData.tableData : internalData.tableFullData, expanded)
      },
      /**
       * ?????????????????????????????????????????????????????????
       * ????????????
       * ????????????
       * @param {Array/Row} rows ?????????
       * @param {Boolean} expanded ????????????
       */
      setRowExpand (rows, expanded) {
        let { rowExpandeds, expandLazyLoadeds, expandColumn: column } = reactData
        const { fullAllDataRowIdData } = internalData
        const expandOpts = computeExpandOpts.value
        const { reserve, lazy, accordion, toggleMethod } = expandOpts
        const lazyRests: any[] = []
        const columnIndex = tableMethods.getColumnIndex(column)
        const $columnIndex = tableMethods.getVMColumnIndex(column)
        if (rows) {
          if (!XEUtils.isArray(rows)) {
            rows = [rows]
          }
          if (accordion) {
            // ????????????????????????
            rowExpandeds = []
            rows = rows.slice(rows.length - 1, rows.length)
          }
          const validRows = toggleMethod ? rows.filter((row: any) => toggleMethod({ $table: $xetable, expanded, column, columnIndex, $columnIndex, row, rowIndex: tableMethods.getRowIndex(row), $rowIndex: tableMethods.getVMRowIndex(row) })) : rows
          if (expanded) {
            validRows.forEach((row: any) => {
              if ($xetable.findRowIndexOf(rowExpandeds, row) === -1) {
                const rest = fullAllDataRowIdData[getRowid($xetable, row)]
                const isLoad = lazy && !rest.expandLoaded && $xetable.findRowIndexOf(expandLazyLoadeds, row) === -1
                if (isLoad) {
                  lazyRests.push(handleAsyncRowExpand(row))
                } else {
                  rowExpandeds.push(row)
                }
              }
            })
          } else {
            XEUtils.remove(rowExpandeds, row => $xetable.findRowIndexOf(validRows, row) > -1)
          }
          if (reserve) {
            validRows.forEach((row: any) => handleRowExpandReserve(row, expanded))
          }
        }
        reactData.rowExpandeds = rowExpandeds
        return Promise.all(lazyRests).then(() => tableMethods.recalculate())
      },
      /**
       * ??????????????????????????????
       * @param {Row} row ?????????
       */
      isExpandByRow (row) {
        const { rowExpandeds } = reactData
        return $xetable.findRowIndexOf(rowExpandeds, row) > -1
      },
      /**
       * ??????????????????????????????????????????????????????????????????
       */
      clearRowExpand () {
        const { rowExpandeds } = reactData
        const { tableFullData } = internalData
        const expandOpts = computeExpandOpts.value
        const { reserve } = expandOpts
        const isExists = rowExpandeds.length
        reactData.rowExpandeds = []
        if (reserve) {
          tableFullData.forEach((row) => handleRowExpandReserve(row, false))
        }
        return nextTick().then(() => {
          if (isExists) {
            tableMethods.recalculate()
          }
        })
      },
      clearRowExpandReserve () {
        internalData.rowExpandedReserveRowMap = {}
        return nextTick()
      },
      getRowExpandRecords () {
        return reactData.rowExpandeds.slice(0)
      },
      getTreeExpandRecords () {
        return reactData.treeExpandeds.slice(0)
      },
      /**
       * ????????????????????????????????????
       * @param {Row} row ?????????
       */
      isTreeExpandLoaded (row) {
        const { fullAllDataRowIdData } = internalData
        const rest = fullAllDataRowIdData[getRowid($xetable, row)]
        return rest && !!rest.treeLoaded
      },
      clearTreeExpandLoaded (row) {
        const { treeExpandeds } = reactData
        const { fullAllDataRowIdData } = internalData
        const treeOpts = computeTreeOpts.value
        const { transform, lazy } = treeOpts
        const rest = fullAllDataRowIdData[getRowid($xetable, row)]
        if (lazy && rest) {
          rest.treeLoaded = false
          XEUtils.remove(treeExpandeds, item => $xetable.eqRow(item, row))
        }
        if (transform) {
          handleVirtualTreeToList()
          return tablePrivateMethods.handleTableData()
        }
        return nextTick()
      },
      /**
       * ?????????????????????????????????????????????
       * @param {Row} row ?????????
       */
      reloadTreeExpand (row) {
        const { treeLazyLoadeds } = reactData
        const treeOpts = computeTreeOpts.value
        const { transform, lazy, hasChild } = treeOpts
        if (lazy && row[hasChild] && $xetable.findRowIndexOf(treeLazyLoadeds, row) === -1) {
          tableMethods.clearTreeExpandLoaded(row).then(() => {
            return handleAsyncTreeExpandChilds(row)
          }).then(() => {
            if (transform) {
              handleVirtualTreeToList()
              return tablePrivateMethods.handleTableData()
            }
          }).then(() => {
            return tableMethods.recalculate()
          })
        }
        return nextTick()
      },
      reloadTreeChilds (row) {
        if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
          warnLog('vxe.error.delFunc', ['reloadTreeChilds', 'reloadTreeExpand'])
        }
        // ????????????
        return tableMethods.reloadTreeExpand(row)
      },
      /**
       * ??????/???????????????
       */
      toggleTreeExpand (row) {
        return tableMethods.setTreeExpand(row, !tableMethods.isTreeExpandByRow(row))
      },
      /**
       * ????????????????????????????????????
       * @param {Boolean} expanded ????????????
       */
      setAllTreeExpand (expanded: boolean) {
        const { tableFullData } = internalData
        const treeOpts = computeTreeOpts.value
        const { transform, lazy, children } = treeOpts
        const expandeds: any[] = []
        XEUtils.eachTree(tableFullData, (row) => {
          const rowChildren = row[children]
          if (lazy || (rowChildren && rowChildren.length)) {
            expandeds.push(row)
          }
        }, treeOpts)
        return tableMethods.setTreeExpand(expandeds, expanded).then(() => {
          if (transform) {
            handleVirtualTreeToList()
            return tableMethods.recalculate()
          }
        })
      },
      /**
       * ??????????????????????????????????????????????????????????????????
       * ????????????
       * ????????????
       * @param {Array/Row} rows ?????????
       * @param {Boolean} expanded ????????????
       */
      setTreeExpand (rows, expanded) {
        const treeOpts = computeTreeOpts.value
        const { transform } = treeOpts
        if (rows) {
          if (!XEUtils.isArray(rows)) {
            rows = [rows]
          }
          if (rows.length) {
            // ??????????????????
            if (transform) {
              return handleVirtualTreeExpand(rows, expanded)
            } else {
              return handleBaseTreeExpand(rows, expanded)
            }
          }
        }
        return nextTick()
      },
      /**
       * ??????????????????????????????????????????
       * @param {Row} row ?????????
       */
      isTreeExpandByRow (row) {
        const { treeExpandeds } = reactData
        return $xetable.findRowIndexOf(treeExpandeds, row) > -1
      },
      /**
       * ??????????????????????????????????????????????????????????????????????????????
       */
      clearTreeExpand () {
        const { treeExpandeds } = reactData
        const { tableFullTreeData } = internalData
        const treeOpts = computeTreeOpts.value
        const { transform, reserve } = treeOpts
        const isExists = treeExpandeds.length
        reactData.treeExpandeds = []
        if (reserve) {
          XEUtils.eachTree(tableFullTreeData, row => handleTreeExpandReserve(row, false), treeOpts)
        }
        return tablePrivateMethods.handleTableData().then(() => {
          if (transform) {
            handleVirtualTreeToList()
            return tablePrivateMethods.handleTableData()
          }
        }).then(() => {
          if (isExists) {
            return tableMethods.recalculate()
          }
        })
      },
      clearTreeExpandReserve () {
        internalData.treeExpandedReserveRowMap = {}
        return nextTick()
      },
      /**
       * ???????????????????????????
       */
      getScroll () {
        const { scrollXLoad, scrollYLoad } = reactData
        const tableBody = refTableBody.value
        const bodyElem = tableBody.$el as HTMLDivElement
        return {
          virtualX: scrollXLoad,
          virtualY: scrollYLoad,
          scrollTop: bodyElem.scrollTop,
          scrollLeft: bodyElem.scrollLeft
        }
      },
      /**
       * ????????????????????????????????????????????????
       * @param {Number} scrollLeft ?????????
       * @param {Number} scrollTop ?????????
       */
      scrollTo (scrollLeft: number, scrollTop?: number) {
        const tableBody = refTableBody.value
        const tableFooter = refTableFooter.value
        const rightBody = refTableRightBody.value
        const tableBodyElem = tableBody ? tableBody.$el as HTMLDivElement : null
        const rightBodyElem = rightBody ? rightBody.$el as HTMLDivElement : null
        const tableFooterElem = tableFooter ? tableFooter.$el as HTMLDivElement : null
        if (XEUtils.isNumber(scrollLeft)) {
          setScrollLeft(tableFooterElem || tableBodyElem, scrollLeft)
        }
        if (XEUtils.isNumber(scrollTop)) {
          setScrollTop(rightBodyElem || tableBodyElem, scrollTop)
        }
        if (reactData.scrollXLoad || reactData.scrollYLoad) {
          return new Promise(resolve => setTimeout(() => resolve(nextTick()), 50))
        }
        return nextTick()
      },
      /**
       * ?????????????????????????????????????????????
       * @param {Row} row ?????????
       * @param {ColumnInfo} fieldOrColumn ?????????
       */
      scrollToRow (row, fieldOrColumn) {
        const rest = []
        if (row) {
          if (props.treeConfig) {
            rest.push(tablePrivateMethods.scrollToTreeRow(row))
          } else {
            rest.push(rowToVisible($xetable, row))
          }
        }
        if (fieldOrColumn) {
          rest.push(tableMethods.scrollToColumn(fieldOrColumn))
        }
        return Promise.all(rest)
      },
      /**
       * ?????????????????????????????????????????????
       */
      scrollToColumn (fieldOrColumn) {
        const { fullColumnIdData } = internalData
        const column = handleFieldOrColumn($xetable, fieldOrColumn)
        if (column && fullColumnIdData[column.id]) {
          return colToVisible($xetable, column)
        }
        return nextTick()
      },
      /**
       * ??????????????????????????????????????????????????????
       */
      clearScroll () {
        const { scrollXStore, scrollYStore } = internalData
        const tableBody = refTableBody.value
        const tableFooter = refTableFooter.value
        const rightBody = refTableRightBody.value
        const tableBodyElem = tableBody ? tableBody.$el as XEBodyScrollElement : null
        const rightBodyElem = rightBody ? rightBody.$el as XEBodyScrollElement : null
        const tableFooterElem = tableFooter ? tableFooter.$el as HTMLDivElement : null
        if (rightBodyElem) {
          restoreScrollListener(rightBodyElem)
          rightBodyElem.scrollTop = 0
        }
        if (tableFooterElem) {
          tableFooterElem.scrollLeft = 0
        }
        if (tableBodyElem) {
          restoreScrollListener(tableBodyElem)
          tableBodyElem.scrollTop = 0
          tableBodyElem.scrollLeft = 0
        }
        scrollXStore.startIndex = 0
        scrollYStore.startIndex = 0
        return nextTick()
      },
      /**
       * ??????????????????
       */
      updateFooter () {
        const { showFooter, footerMethod } = props
        const { visibleColumn, afterFullData } = internalData
        if (showFooter && footerMethod) {
          reactData.footerTableData = visibleColumn.length ? footerMethod({ columns: visibleColumn, data: afterFullData, $table: $xetable, $grid: $xegrid }) : []
        }
        return nextTick()
      },
      /**
       * ???????????????
       * ??????????????? v-model ?????? change ??????????????????????????????????????????????????????
       * ?????????????????????????????????????????????????????????
       */
      updateStatus (scope, cellValue) {
        const customVal = !XEUtils.isUndefined(cellValue)
        return nextTick().then(() => {
          const { editRules } = props
          const { validStore } = reactData
          const tableBody = refTableBody.value
          if (scope && tableBody && editRules) {
            const { row, column } = scope
            const type = 'change'
            if ($xetable.hasCellRules) {
              if ($xetable.hasCellRules(type, row, column)) {
                const cell = tablePrivateMethods.getCell(row, column)
                if (cell) {
                  return $xetable.validCellRules(type, row, column, cellValue)
                    .then(() => {
                      if (customVal && validStore.visible) {
                        setCellValue(row, column, cellValue)
                      }
                      $xetable.clearValidate()
                    })
                    .catch(({ rule }) => {
                      if (customVal) {
                        setCellValue(row, column, cellValue)
                      }
                      $xetable.showValidTooltip({ rule, row, column, cell })
                    })
                }
              }
            }
          }
        })
      },
      /**
       * ?????????????????????
       * @param {TableMergeConfig[]} merges { row: Row|number, column: ColumnInfo|number, rowspan: number, colspan: number }
       */
      setMergeCells (merges) {
        if (props.spanMethod) {
          errLog('vxe.error.errConflicts', ['merge-cells', 'span-method'])
        }
        setMerges(merges, reactData.mergeList, internalData.afterFullData)
        return nextTick().then(() => tablePrivateMethods.updateCellAreas())
      },
      /**
       * ?????????????????????
       * @param {TableMergeConfig[]} merges ??????????????? [{row:Row|number, col:ColumnInfo|number}]
       */
      removeMergeCells (merges) {
        if (props.spanMethod) {
          errLog('vxe.error.errConflicts', ['merge-cells', 'span-method'])
        }
        const rest = removeMerges(merges, reactData.mergeList, internalData.afterFullData)
        return nextTick().then(() => {
          tablePrivateMethods.updateCellAreas()
          return rest
        })
      },
      /**
       * ?????????????????????????????????
       */
      getMergeCells () {
        return reactData.mergeList.slice(0)
      },
      /**
       * ???????????????????????????
       */
      clearMergeCells () {
        reactData.mergeList = []
        return nextTick()
      },
      setMergeFooterItems (merges) {
        if (props.footerSpanMethod) {
          errLog('vxe.error.errConflicts', ['merge-footer-items', 'footer-span-method'])
        }
        setMerges(merges, reactData.mergeFooterList)
        return nextTick().then(() => tablePrivateMethods.updateCellAreas())
      },
      removeMergeFooterItems (merges) {
        if (props.footerSpanMethod) {
          errLog('vxe.error.errConflicts', ['merge-footer-items', 'footer-span-method'])
        }
        const rest = removeMerges(merges, reactData.mergeFooterList)
        return nextTick().then(() => {
          tablePrivateMethods.updateCellAreas()
          return rest
        })
      },
      /**
       * ??????????????????????????????
       */
      getMergeFooterItems () {
        return reactData.mergeFooterList.slice(0)
      },
      /**
       * ????????????????????????
       */
      clearMergeFooterItems () {
        reactData.mergeFooterList = []
        return nextTick()
      },
      focus () {
        internalData.isActivated = true
        return nextTick()
      },
      blur () {
        internalData.isActivated = false
        return nextTick()
      },
      /**
       * ???????????????
       * @param $toolbar
       */
      connect ($toolbar) {
        if ($toolbar) {
          $xetoolbar = $toolbar
          $xetoolbar.syncUpdate({ collectColumn: internalData.collectColumn, $table: $xetable })
        } else {
          errLog('vxe.error.barUnableLink')
        }
        return nextTick()
      }
    }

    /**
     * ????????????????????????
     */
    const handleGlobalMousedownEvent = (evnt: MouseEvent) => {
      const { editStore, ctxMenuStore, filterStore } = reactData
      const { mouseConfig } = props
      const el = refElem.value
      const editOpts = computeEditOpts.value
      const { actived } = editStore
      const $validTooltip = refValidTooltip.value
      const tableFilter = refTableFilter.value
      const tableMenu = refTableMenu.value
      if (tableFilter) {
        if (getEventTargetNode(evnt, el, 'vxe-cell--filter').flag) {
          // ???????????????????????????
        } else if (getEventTargetNode(evnt, tableFilter.$el as HTMLDivElement).flag) {
          // ????????????????????????
        } else {
          if (!getEventTargetNode(evnt, document.body, 'vxe-table--ignore-clear').flag) {
            tablePrivateMethods.preventEvent(evnt, 'event.clearFilter', filterStore.args, tableMethods.closeFilter)
          }
        }
      }
      // ??????????????????????????????
      if (actived.row) {
        if (!(editOpts.autoClear === false)) {
          // ????????????????????????????????????????????????
          const cell = actived.args.cell
          if ((!cell || !getEventTargetNode(evnt, cell).flag)) {
            if ($validTooltip && getEventTargetNode(evnt, $validTooltip.$el as HTMLDivElement).flag) {
              // ???????????????????????????????????????????????????
            } else if (!internalData._lastCallTime || internalData._lastCallTime + 50 < Date.now()) {
              // ????????????????????????????????????????????????
              if (!getEventTargetNode(evnt, document.body, 'vxe-table--ignore-clear').flag) {
                // ????????????????????????????????????????????????????????????????????????????????????
                tablePrivateMethods.preventEvent(evnt, 'event.clearActived', actived.args, () => {
                  let isClear
                  if (editOpts.mode === 'row') {
                    const rowTargetNode = getEventTargetNode(evnt, el, 'vxe-body--row')
                    const rowNodeRest = rowTargetNode.flag ? tableMethods.getRowNode(rowTargetNode.targetElem) : null
                    // row ?????????????????????????????????
                    isClear = rowNodeRest ? !$xetable.eqRow(rowNodeRest.item, actived.args.row) : false
                  } else {
                    // cell ??????????????????????????????
                    isClear = !getEventTargetNode(evnt, el, 'col--edit').flag
                  }
                  // ?????????????????????????????????????????????
                  if (!isClear) {
                    isClear = getEventTargetNode(evnt, el, 'vxe-header--row').flag
                  }
                  // ?????????????????????????????????????????????
                  if (!isClear) {
                    isClear = getEventTargetNode(evnt, el, 'vxe-footer--row').flag
                  }
                  // ??????????????????????????????????????????????????????????????????????????????
                  if (!isClear && props.height && !reactData.overflowY) {
                    const bodyWrapperElem = evnt.target as HTMLDivElement
                    if (hasClass(bodyWrapperElem, 'vxe-table--body-wrapper')) {
                      isClear = evnt.offsetY < bodyWrapperElem.clientHeight
                    }
                  }
                  if (
                    isClear ||
                      // ?????????????????????????????????
                      !getEventTargetNode(evnt, el).flag
                  ) {
                    setTimeout(() => $xetable.clearEdit(evnt))
                  }
                })
              }
            }
          }
        }
      } else if (mouseConfig) {
        if (!getEventTargetNode(evnt, el).flag && !($xegrid && getEventTargetNode(evnt, $xegrid.getRefMaps().refElem.value).flag) && !(tableMenu && getEventTargetNode(evnt, tableMenu.getRefMaps().refElem.value).flag) && !($xetoolbar && getEventTargetNode(evnt, $xetoolbar.getRefMaps().refElem.value).flag)) {
          $xetable.clearSelected()
          if ($xetable.clearCellAreas) {
            if (!getEventTargetNode(evnt, document.body, 'vxe-table--ignore-areas-clear').flag) {
              tablePrivateMethods.preventEvent(evnt, 'event.clearAreas', {}, () => {
                $xetable.clearCellAreas()
                $xetable.clearCopyCellArea()
              })
            }
          }
        }
      }
      // ???????????????????????????????????????????????????????????????
      if ($xetable.closeMenu) {
        if (ctxMenuStore.visible && tableMenu && !getEventTargetNode(evnt, tableMenu.getRefMaps().refElem.value).flag) {
          $xetable.closeMenu()
        }
      }
      // ?????????????????????
      internalData.isActivated = getEventTargetNode(evnt, $xegrid ? $xegrid.getRefMaps().refElem.value : el).flag
    }

    /**
     * ????????????????????????
     */
    const handleGlobalBlurEvent = () => {
      tableMethods.closeFilter()
      if ($xetable.closeMenu) {
        $xetable.closeMenu()
      }
    }

    /**
     * ??????????????????
     */
    const handleGlobalMousewheelEvent = () => {
      tableMethods.closeTooltip()
      if ($xetable.closeMenu) {
        $xetable.closeMenu()
      }
    }

    /**
     * ??????????????????
     */
    const keydownEvent = (evnt: KeyboardEvent) => {
      const { mouseConfig, keyboardConfig } = props
      const { filterStore, ctxMenuStore, editStore } = reactData
      const mouseOpts = computeMouseOpts.value
      const keyboardOpts = computeKeyboardOpts.value
      const { actived } = editStore
      const isEsc = hasEventKey(evnt, EVENT_KEYS.ESCAPE)
      if (isEsc) {
        tablePrivateMethods.preventEvent(evnt, 'event.keydown', null, () => {
          tableMethods.dispatchEvent('keydown-start', {}, evnt)
          if (keyboardConfig && mouseConfig && mouseOpts.area && $xetable.handleKeyboardEvent) {
            $xetable.handleKeyboardEvent(evnt)
          } else if (actived.row || filterStore.visible || ctxMenuStore.visible) {
            evnt.stopPropagation()
            // ??????????????? Esc ?????????????????????????????????
            if ($xetable.closeMenu) {
              $xetable.closeMenu()
            }
            tableMethods.closeFilter()
            if (keyboardConfig && keyboardOpts.isEsc) {
              // ?????????????????????????????????????????????
              if (actived.row) {
                const params = actived.args
                $xetable.clearEdit(evnt)
                // ????????????????????????????????????????????????
                if (mouseOpts.selected) {
                  nextTick(() => $xetable.handleSelected(params, evnt))
                }
              }
            }
          }
          tableMethods.dispatchEvent('keydown', {}, evnt)
          tableMethods.dispatchEvent('keydown-end', {}, evnt)
        })
      }
    }

    /**
     * ??????????????????
     */
    const handleGlobalKeydownEvent = (evnt: KeyboardEvent) => {
      // ??????????????????????????????????????????
      if (internalData.isActivated) {
        tablePrivateMethods.preventEvent(evnt, 'event.keydown', null, () => {
          const { mouseConfig, keyboardConfig, treeConfig, editConfig, highlightCurrentRow } = props
          const { ctxMenuStore, editStore, currentRow } = reactData
          const isMenu = computeIsMenu.value
          const bodyMenu = computeBodyMenu.value
          const keyboardOpts = computeKeyboardOpts.value
          const mouseOpts = computeMouseOpts.value
          const editOpts = computeEditOpts.value
          const treeOpts = computeTreeOpts.value
          const menuList = computeMenuList.value
          const rowOpts = computeRowOpts.value
          const { selected, actived } = editStore
          const keyCode = evnt.keyCode
          const isEsc = hasEventKey(evnt, EVENT_KEYS.ESCAPE)
          const isBack = hasEventKey(evnt, EVENT_KEYS.BACKSPACE)
          const isTab = hasEventKey(evnt, EVENT_KEYS.TAB)
          const isEnter = hasEventKey(evnt, EVENT_KEYS.ENTER)
          const isSpacebar = hasEventKey(evnt, EVENT_KEYS.SPACEBAR)
          const isLeftArrow = hasEventKey(evnt, EVENT_KEYS.ARROW_LEFT)
          const isUpArrow = hasEventKey(evnt, EVENT_KEYS.ARROW_UP)
          const isRightArrow = hasEventKey(evnt, EVENT_KEYS.ARROW_RIGHT)
          const isDwArrow = hasEventKey(evnt, EVENT_KEYS.ARROW_DOWN)
          const isDel = hasEventKey(evnt, EVENT_KEYS.DELETE)
          const isF2 = hasEventKey(evnt, EVENT_KEYS.F2)
          const isContextMenu = hasEventKey(evnt, EVENT_KEYS.CONTEXT_MENU)
          const hasMetaKey = evnt.metaKey
          const hasCtrlKey = evnt.ctrlKey
          const hasShiftKey = evnt.shiftKey
          const isAltKey = evnt.altKey
          const operArrow = isLeftArrow || isUpArrow || isRightArrow || isDwArrow
          const operCtxMenu = isMenu && ctxMenuStore.visible && (isEnter || isSpacebar || operArrow)
          const isEditStatus = isEnableConf(editConfig) && actived.column && actived.row
          let params: any
          if (operCtxMenu) {
            // ???????????????????????????; ??????????????????????????????
            evnt.preventDefault()
            if (ctxMenuStore.showChild && hasChildrenList(ctxMenuStore.selected)) {
              $xetable.moveCtxMenu(evnt, ctxMenuStore, 'selectChild', isLeftArrow, false, ctxMenuStore.selected.children)
            } else {
              $xetable.moveCtxMenu(evnt, ctxMenuStore, 'selected', isRightArrow, true, menuList)
            }
          } else if (keyboardConfig && mouseConfig && mouseOpts.area && $xetable.handleKeyboardEvent) {
            $xetable.handleKeyboardEvent(evnt)
          } else if (isEsc) {
            // ??????????????? Esc ?????????????????????????????????
            if ($xetable.closeMenu) {
              $xetable.closeMenu()
            }
            tableMethods.closeFilter()
            if (keyboardConfig && keyboardOpts.isEsc) {
              // ?????????????????????????????????????????????
              if (actived.row) {
                const params = actived.args
                $xetable.clearEdit(evnt)
                // ????????????????????????????????????????????????
                if (mouseOpts.selected) {
                  nextTick(() => $xetable.handleSelected(params, evnt))
                }
              }
            }
          } else if (isSpacebar && keyboardConfig && keyboardOpts.isChecked && selected.row && selected.column && (selected.column.type === 'checkbox' || selected.column.type === 'radio')) {
            // ??????????????????????????????
            evnt.preventDefault()
            if (selected.column.type === 'checkbox') {
              tablePrivateMethods.handleToggleCheckRowEvent(evnt, selected.args)
            } else {
              tablePrivateMethods.triggerRadioRowEvent(evnt, selected.args)
            }
          } else if (isF2 && isEnableConf(editConfig)) {
            if (!isEditStatus) {
              // ??????????????? F2 ???
              if (selected.row && selected.column) {
                evnt.preventDefault()
                $xetable.handleActived(selected.args, evnt)
              }
            }
          } else if (isContextMenu) {
            // ????????????????????????
            internalData._keyCtx = selected.row && selected.column && bodyMenu.length
            clearTimeout(keyCtxTimeout)
            keyCtxTimeout = setTimeout(() => {
              internalData._keyCtx = false
            }, 1000)
          } else if (isEnter && !isAltKey && keyboardConfig && keyboardOpts.isEnter && (selected.row || actived.row || (treeConfig && (rowOpts.isCurrent || highlightCurrentRow) && currentRow))) {
            // ????????????
            if (hasCtrlKey) {
              // ?????????????????????????????????????????????
              if (actived.row) {
                params = actived.args
                $xetable.clearEdit(evnt)
                // ????????????????????????????????????????????????
                if (mouseOpts.selected) {
                  nextTick(() => $xetable.handleSelected(params, evnt))
                }
              }
            } else {
              // ?????????????????????????????????????????????/?????????
              if (selected.row || actived.row) {
                const targetArgs = selected.row ? selected.args : actived.args
                if (hasShiftKey) {
                  if (keyboardOpts.enterToTab) {
                    $xetable.moveTabSelected(targetArgs, hasShiftKey, evnt)
                  } else {
                    $xetable.moveSelected(targetArgs, isLeftArrow, true, isRightArrow, false, evnt)
                  }
                } else {
                  if (keyboardOpts.enterToTab) {
                    $xetable.moveTabSelected(targetArgs, hasShiftKey, evnt)
                  } else {
                    $xetable.moveSelected(targetArgs, isLeftArrow, false, isRightArrow, true, evnt)
                  }
                }
              } else if (treeConfig && (rowOpts.isCurrent || highlightCurrentRow) && currentRow) {
                // ??????????????????????????????????????????????????????
                const childrens = currentRow[treeOpts.children]
                if (childrens && childrens.length) {
                  evnt.preventDefault()
                  const targetRow = childrens[0]
                  params = {
                    $table: $xetable,
                    row: targetRow,
                    rowIndex: tableMethods.getRowIndex(targetRow),
                    $rowIndex: tableMethods.getVMRowIndex(targetRow)
                  }
                  tableMethods.setTreeExpand(currentRow, true)
                    .then(() => tableMethods.scrollToRow(targetRow))
                    .then(() => tablePrivateMethods.triggerCurrentRowEvent(evnt, params))
                }
              }
            }
          } else if (operArrow && keyboardConfig && keyboardOpts.isArrow) {
            if (!isEditStatus) {
              // ????????????????????????
              if (selected.row && selected.column) {
                $xetable.moveSelected(selected.args, isLeftArrow, isUpArrow, isRightArrow, isDwArrow, evnt)
              } else if ((isUpArrow || isDwArrow) && (rowOpts.isCurrent || highlightCurrentRow)) {
                // ???????????????????????????
                $xetable.moveCurrentRow(isUpArrow, isDwArrow, evnt)
              }
            }
          } else if (isTab && keyboardConfig && keyboardOpts.isTab) {
            // ??????????????? Tab ?????????
            if (selected.row || selected.column) {
              $xetable.moveTabSelected(selected.args, hasShiftKey, evnt)
            } else if (actived.row || actived.column) {
              $xetable.moveTabSelected(actived.args, hasShiftKey, evnt)
            }
          } else if (keyboardConfig && isEnableConf(editConfig) && (isDel || (treeConfig && (rowOpts.isCurrent || highlightCurrentRow) && currentRow ? isBack && keyboardOpts.isArrow : isBack))) {
            if (!isEditStatus) {
              const { delMethod, backMethod } = keyboardOpts
              // ??????????????????
              if (keyboardOpts.isDel && (selected.row || selected.column)) {
                if (delMethod) {
                  delMethod({
                    row: selected.row,
                    rowIndex: tableMethods.getRowIndex(selected.row),
                    column: selected.column,
                    columnIndex: tableMethods.getColumnIndex(selected.column),
                    $table: $xetable
                  })
                } else {
                  setCellValue(selected.row, selected.column, null)
                }
                if (isBack) {
                  if (backMethod) {
                    backMethod({
                      row: selected.row,
                      rowIndex: tableMethods.getRowIndex(selected.row),
                      column: selected.column,
                      columnIndex: tableMethods.getColumnIndex(selected.column),
                      $table: $xetable
                    })
                  } else {
                    $xetable.handleActived(selected.args, evnt)
                  }
                } else if (isDel) {
                  // ???????????? del ????????????????????????
                  tableMethods.updateFooter()
                }
              } else if (isBack && keyboardOpts.isArrow && treeConfig && (rowOpts.isCurrent || highlightCurrentRow) && currentRow) {
                // ?????????????????????????????????????????????????????????
                const { parent: parentRow } = XEUtils.findTree(internalData.afterFullData, item => item === currentRow, treeOpts)
                if (parentRow) {
                  evnt.preventDefault()
                  params = {
                    $table: $xetable,
                    row: parentRow,
                    rowIndex: tableMethods.getRowIndex(parentRow),
                    $rowIndex: tableMethods.getVMRowIndex(parentRow)
                  }
                  tableMethods.setTreeExpand(parentRow, false)
                    .then(() => tableMethods.scrollToRow(parentRow))
                    .then(() => tablePrivateMethods.triggerCurrentRowEvent(evnt, params))
                }
              }
            }
          } else if (keyboardConfig && isEnableConf(editConfig) && keyboardOpts.isEdit && !hasCtrlKey && !hasMetaKey && (isSpacebar || (keyCode >= 48 && keyCode <= 57) || (keyCode >= 65 && keyCode <= 90) || (keyCode >= 96 && keyCode <= 111) || (keyCode >= 186 && keyCode <= 192) || (keyCode >= 219 && keyCode <= 222))) {
            const { editMethod } = keyboardOpts
            // ??????????????????????????????????????????
            // if (isSpacebar) {
            //   evnt.preventDefault()
            // }
            // ???????????????????????????????????????????????????
            if (selected.column && selected.row && isEnableConf(selected.column.editRender)) {
              const beforeEditMethod = editOpts.beforeEditMethod || editOpts.activeMethod
              if (!beforeEditMethod || beforeEditMethod({ ...selected.args, $table: $xetable })) {
                if (editMethod) {
                  editMethod({
                    row: selected.row,
                    rowIndex: tableMethods.getRowIndex(selected.row),
                    column: selected.column,
                    columnIndex: tableMethods.getColumnIndex(selected.column),
                    $table: $xetable,
                    $grid: $xegrid
                  })
                } else {
                  setCellValue(selected.row, selected.column, null)
                  $xetable.handleActived(selected.args, evnt)
                }
              }
            }
          }
          tableMethods.dispatchEvent('keydown', {}, evnt)
        })
      }
    }

    const handleGlobalPasteEvent = (evnt: ClipboardEvent) => {
      const { keyboardConfig, mouseConfig } = props
      const { editStore, filterStore } = reactData
      const { isActivated } = internalData
      const mouseOpts = computeMouseOpts.value
      const keyboardOpts = computeKeyboardOpts.value
      const { actived } = editStore
      if (isActivated && !filterStore.visible) {
        if (!(actived.row || actived.column)) {
          if (keyboardConfig && keyboardOpts.isClip && mouseConfig && mouseOpts.area && $xetable.handlePasteCellAreaEvent) {
            $xetable.handlePasteCellAreaEvent(evnt)
          }
        }
        tableMethods.dispatchEvent('paste', {}, evnt)
      }
    }

    const handleGlobalCopyEvent = (evnt: ClipboardEvent) => {
      const { keyboardConfig, mouseConfig } = props
      const { editStore, filterStore } = reactData
      const { isActivated } = internalData
      const mouseOpts = computeMouseOpts.value
      const keyboardOpts = computeKeyboardOpts.value
      const { actived } = editStore
      if (isActivated && !filterStore.visible) {
        if (!(actived.row || actived.column)) {
          if (keyboardConfig && keyboardOpts.isClip && mouseConfig && mouseOpts.area && $xetable.handleCopyCellAreaEvent) {
            $xetable.handleCopyCellAreaEvent(evnt)
          }
        }
        tableMethods.dispatchEvent('copy', {}, evnt)
      }
    }

    const handleGlobalCutEvent = (evnt: ClipboardEvent) => {
      const { keyboardConfig, mouseConfig } = props
      const { editStore, filterStore } = reactData
      const { isActivated } = internalData
      const mouseOpts = computeMouseOpts.value
      const keyboardOpts = computeKeyboardOpts.value
      const { actived } = editStore
      if (isActivated && !filterStore.visible) {
        if (!(actived.row || actived.column)) {
          if (keyboardConfig && keyboardOpts.isClip && mouseConfig && mouseOpts.area && $xetable.handleCutCellAreaEvent) {
            $xetable.handleCutCellAreaEvent(evnt)
          }
        }
        tableMethods.dispatchEvent('cut', {}, evnt)
      }
    }

    const handleGlobalResizeEvent = () => {
      if ($xetable.closeMenu) {
        $xetable.closeMenu()
      }
      tablePrivateMethods.updateCellAreas()
      tableMethods.recalculate(true)
    }

    const handleTargetEnterEvent = (isClear: boolean) => {
      const $tooltip = refTooltip.value
      clearTimeout(internalData.tooltipTimeout)
      if (isClear) {
        tableMethods.closeTooltip()
      } else {
        if ($tooltip) {
          $tooltip.setActived(true)
        }
      }
    }

    /**
     * ???????????? tooltip
     * @param {Event} evnt ??????
     * @param {ColumnInfo} column ?????????
     * @param {Row} row ?????????
     */
    const handleTooltip = (evnt: MouseEvent, cell: any, overflowElem: any, tipElem: any, params: any) => {
      params.cell = cell
      const { tooltipStore } = reactData
      const tooltipOpts = computeTooltipOpts.value
      const { column, row } = params
      const { showAll, contentMethod } = tooltipOpts
      const customContent = contentMethod ? contentMethod(params) : null
      const useCustom = contentMethod && !XEUtils.eqNull(customContent)
      const content = useCustom ? customContent : (column.type === 'html' ? overflowElem.innerText : overflowElem.textContent).trim()
      const isCellOverflow = overflowElem.scrollWidth > overflowElem.clientWidth
      if (content && (showAll || useCustom || isCellOverflow)) {
        Object.assign(tooltipStore, {
          row,
          column,
          visible: true,
          currOpts: null
        })
        nextTick(() => {
          const $tooltip = refTooltip.value
          if ($tooltip) {
            $tooltip.open(isCellOverflow ? overflowElem : (tipElem || overflowElem), formatText(content))
          }
        })
      }
      return nextTick()
    }

    /**
     * ????????????
     */
    tablePrivateMethods = {
      getSetupOptions () {
        return GlobalConfig
      },
      updateAfterDataIndex,
      callSlot (slotFunc, params) {
        if (slotFunc) {
          if ($xegrid) {
            return $xegrid.callSlot(slotFunc, params)
          }
          if (XEUtils.isFunction(slotFunc)) {
            return getSlotVNs(slotFunc(params))
          }
        }
        return []
      },
      /**
       * ?????????????????????
       */
      getParentElem () {
        const el = refElem.value
        if ($xegrid) {
          const gridEl = $xegrid.getRefMaps().refElem.value
          return gridEl ? gridEl.parentNode as HTMLElement : null
        }
        return el ? el.parentNode as HTMLElement : null
      },
      /**
       * ????????????????????????
       */
      getParentHeight () {
        const { height } = props
        const el = refElem.value
        if (el) {
          const parentElem = el.parentNode as HTMLElement
          const parentPaddingSize = height === 'auto' ? getPaddingTopBottomSize(parentElem) : 0
          return Math.floor($xegrid ? $xegrid.getParentHeight() : XEUtils.toNumber(getComputedStyle(parentElem).height) - parentPaddingSize)
        }
        return 0
      },
      /**
       * ???????????????????????????
       * ?????????????????????????????????????????????????????????????????????????????????
       * ??????????????????????????????????????????????????????????????????
       */
      getExcludeHeight () {
        return $xegrid ? $xegrid.getExcludeHeight() : 0
      },
      /**
       * ?????????????????????????????????????????????????????????
       * @param {Row} record ?????????
       */
      defineField (record) {
        const { treeConfig } = props
        const expandOpts = computeExpandOpts.value
        const treeOpts = computeTreeOpts.value
        const radioOpts = computeRadioOpts.value
        const checkboxOpts = computeCheckboxOpts.value
        const rowkey = getRowkey($xetable)
        internalData.tableFullColumn.forEach(column => {
          const { field, editRender } = column
          if (field && !XEUtils.has(record, field) && !record[field]) {
            let cellValue = null
            if (editRender) {
              const { defaultValue } = editRender
              if (XEUtils.isFunction(defaultValue)) {
                cellValue = defaultValue({ column })
              } else if (!XEUtils.isUndefined(defaultValue)) {
                cellValue = defaultValue
              }
            }
            XEUtils.set(record, field, cellValue)
          }
        })
        const otherFields: (string | undefined)[] = [radioOpts.labelField, checkboxOpts.checkField, checkboxOpts.labelField, expandOpts.labelField]
        otherFields.forEach((key) => {
          if (key && eqEmptyValue(XEUtils.get(record, key))) {
            XEUtils.set(record, key, null)
          }
        })
        if (treeConfig && treeOpts.lazy && XEUtils.isUndefined(record[treeOpts.children])) {
          record[treeOpts.children] = null
        }
        // ?????????????????????????????????????????????????????????????????????????????????????????????
        if (eqEmptyValue(XEUtils.get(record, rowkey))) {
          XEUtils.set(record, rowkey, getRowUniqueId())
        }
        return record
      },
      handleTableData (force?: boolean) {
        const { scrollYLoad } = reactData
        const { scrollYStore, fullDataRowIdData } = internalData
        let fullList: any[] = internalData.afterFullData
        // ????????????????????????
        if (force) {
          // ????????????????????????????????????
          updateAfterFullData()
          // ???????????????????????????????????????
          fullList = handleVirtualTreeToList()
        }
        const tableData = scrollYLoad ? fullList.slice(scrollYStore.startIndex, scrollYStore.endIndex) : fullList.slice(0)
        tableData.forEach((row, $index) => {
          const rowid = getRowid($xetable, row)
          const rest = fullDataRowIdData[rowid]
          if (rest) {
            rest.$index = $index
          }
        })
        reactData.tableData = tableData
        return nextTick()
      },
      /**
       * ?????????????????? Map
       * ??????????????????????????????????????????????????????????????????
       */
      cacheRowMap (isSource) {
        const { treeConfig } = props
        const treeOpts = computeTreeOpts.value
        let { fullDataRowIdData, fullAllDataRowIdData, tableFullData, tableFullTreeData } = internalData
        const rowkey = getRowkey($xetable)
        const isLazy = treeConfig && treeOpts.lazy
        const handleCache = (row: any, index: any, items: any, path?: any[], parent?: any, nodes?: any[]) => {
          let rowid = getRowid($xetable, row)
          const seq = treeConfig && path ? toTreePathSeq(path) : index + 1
          const level = nodes ? nodes.length - 1 : 0
          if (eqEmptyValue(rowid)) {
            rowid = getRowUniqueId()
            XEUtils.set(row, rowkey, rowid)
          }
          if (isLazy && row[treeOpts.hasChild] && XEUtils.isUndefined(row[treeOpts.children])) {
            row[treeOpts.children] = null
          }
          const rest = { row, rowid, seq, index: treeConfig && parent ? -1 : index, _index: -1, $index: -1, items, parent, level }
          if (isSource) {
            fullDataRowIdData[rowid] = rest
          }
          fullAllDataRowIdData[rowid] = rest
        }
        if (isSource) {
          fullDataRowIdData = internalData.fullDataRowIdData = {}
        }
        fullAllDataRowIdData = internalData.fullAllDataRowIdData = {}
        if (treeConfig) {
          XEUtils.eachTree(tableFullTreeData, handleCache, treeOpts)
        } else {
          tableFullData.forEach(handleCache)
        }
      },
      /**
       * ??????????????????????????????
       */
      analyColumnWidth () {
        const { tableFullColumn } = internalData
        const columnOpts = computeColumnOpts.value
        const { width: defaultWidth, minWidth: defaultMinWidth } = columnOpts
        const resizeList: any[] = []
        const pxList: any[] = []
        const pxMinList: any[] = []
        const scaleList: any[] = []
        const scaleMinList: any[] = []
        const autoList: any[] = []
        tableFullColumn.forEach((column) => {
          if (defaultWidth && !column.width) {
            column.width = defaultWidth
          }
          if (defaultMinWidth && !column.minWidth) {
            column.minWidth = defaultMinWidth
          }
          if (column.visible) {
            if (column.resizeWidth) {
              resizeList.push(column)
            } else if (isPx(column.width)) {
              pxList.push(column)
            } else if (isScale(column.width)) {
              scaleList.push(column)
            } else if (isPx(column.minWidth)) {
              pxMinList.push(column)
            } else if (isScale(column.minWidth)) {
              scaleMinList.push(column)
            } else {
              autoList.push(column)
            }
          }
        })
        Object.assign(reactData.columnStore, { resizeList, pxList, pxMinList, scaleList, scaleMinList, autoList })
      },
      saveCustomResizable (isReset?: boolean) {
        const { id, customConfig } = props
        const customOpts = computeCustomOpts.value
        const { collectColumn } = internalData
        const { storage } = customOpts
        const isResizable = storage === true || (storage && storage.resizable)
        if (customConfig && isResizable) {
          const columnWidthStorageMap = getCustomStorageMap(resizableStorageKey)
          let columnWidthStorage: any
          if (!id) {
            errLog('vxe.error.reqProp', ['id'])
            return
          }
          if (!isReset) {
            columnWidthStorage = XEUtils.isPlainObject(columnWidthStorageMap[id]) ? columnWidthStorageMap[id] : {}
            XEUtils.eachTree(collectColumn, (column) => {
              if (column.resizeWidth) {
                const colKey = column.getKey()
                if (colKey) {
                  columnWidthStorage[colKey] = column.renderWidth
                }
              }
            })
          }
          columnWidthStorageMap[id] = XEUtils.isEmpty(columnWidthStorage) ? undefined : columnWidthStorage
          localStorage.setItem(resizableStorageKey, XEUtils.toJSONString(columnWidthStorageMap))
        }
      },
      saveCustomVisible () {
        const { id, customConfig } = props
        const { collectColumn } = internalData
        const customOpts = computeCustomOpts.value
        const { checkMethod, storage } = customOpts
        const isVisible = storage === true || (storage && storage.visible)
        if (customConfig && isVisible) {
          const columnVisibleStorageMap = getCustomStorageMap(visibleStorageKey)
          const colHides: any[] = []
          const colShows: any[] = []
          if (!id) {
            errLog('vxe.error.reqProp', ['id'])
            return
          }
          XEUtils.eachTree(collectColumn, (column) => {
            if (!checkMethod || checkMethod({ column })) {
              if (!column.visible && column.defaultVisible) {
                const colKey = column.getKey()
                if (colKey) {
                  colHides.push(colKey)
                }
              } else if (column.visible && !column.defaultVisible) {
                const colKey = column.getKey()
                if (colKey) {
                  colShows.push(colKey)
                }
              }
            }
          })
          columnVisibleStorageMap[id] = [colHides.join(',')].concat(colShows.length ? [colShows.join(',')] : []).join('|') || undefined
          localStorage.setItem(visibleStorageKey, XEUtils.toJSONString(columnVisibleStorageMap))
        }
      },
      handleCustom () {
        tablePrivateMethods.saveCustomVisible()
        tablePrivateMethods.analyColumnWidth()
        return tableMethods.refreshColumn()
      },
      preventEvent (evnt, type, args, next, end) {
        const evntList = VXETable.interceptor.get(type)
        let rest
        if (!evntList.some((func) => func(Object.assign({ $grid: $xegrid, $table: $xetable, $event: evnt }, args)) === false)) {
          if (next) {
            rest = next()
          }
        }
        if (end) {
          end()
        }
        return rest
      },
      checkSelectionStatus () {
        const { treeConfig } = props
        const { selection, treeIndeterminates } = reactData
        const { afterFullData } = internalData
        const checkboxOpts = computeCheckboxOpts.value
        const { checkField, halfField, checkStrictly, checkMethod } = checkboxOpts
        if (!checkStrictly) {
          const disableRows = []
          const checkRows = []
          let isAllResolve = false
          let isAllSelected = false
          let isIndeterminate = false
          if (checkField) {
            isAllResolve = afterFullData.every(
              checkMethod
                ? (row) => {
                  if (!checkMethod({ row })) {
                    disableRows.push(row)
                    return true
                  }
                  if (XEUtils.get(row, checkField)) {
                    checkRows.push(row)
                    return true
                  }
                  return false
                }
                : row => XEUtils.get(row, checkField)
            )
            isAllSelected = isAllResolve && afterFullData.length !== disableRows.length
            if (treeConfig) {
              if (halfField) {
                isIndeterminate = !isAllSelected && afterFullData.some((row) => XEUtils.get(row, checkField) || XEUtils.get(row, halfField) || $xetable.findRowIndexOf(treeIndeterminates, row) > -1)
              } else {
                isIndeterminate = !isAllSelected && afterFullData.some((row) => XEUtils.get(row, checkField) || $xetable.findRowIndexOf(treeIndeterminates, row) > -1)
              }
            } else {
              if (halfField) {
                isIndeterminate = !isAllSelected && afterFullData.some((row) => XEUtils.get(row, checkField) || XEUtils.get(row, halfField))
              } else {
                isIndeterminate = !isAllSelected && afterFullData.some((row) => XEUtils.get(row, checkField))
              }
            }
          } else {
            isAllResolve = afterFullData.every(
              checkMethod
                ? (row) => {
                  if (!checkMethod({ row })) {
                    disableRows.push(row)
                    return true
                  }
                  if ($xetable.findRowIndexOf(selection, row) > -1) {
                    checkRows.push(row)
                    return true
                  }
                  return false
                }
                : row => $xetable.findRowIndexOf(selection, row) > -1
            )
            isAllSelected = isAllResolve && afterFullData.length !== disableRows.length
            if (treeConfig) {
              isIndeterminate = !isAllSelected && afterFullData.some((row) => $xetable.findRowIndexOf(treeIndeterminates, row) > -1 || $xetable.findRowIndexOf(selection, row) > -1)
            } else {
              isIndeterminate = !isAllSelected && afterFullData.some((row) => $xetable.findRowIndexOf(selection, row) > -1)
            }
          }
          reactData.isAllSelected = isAllSelected
          reactData.isIndeterminate = isIndeterminate
        }
      },
      /**
       * ????????????????????????
       * value ??????true ??????false ??????-1
       */
      handleSelectRow ({ row }, value) {
        const { treeConfig } = props
        const { selection, treeIndeterminates } = reactData
        const { afterFullData } = internalData
        const treeOpts = computeTreeOpts.value
        const checkboxOpts = computeCheckboxOpts.value
        const { checkField, checkStrictly, checkMethod } = checkboxOpts
        if (checkField) {
          if (treeConfig && !checkStrictly) {
            if (value === -1) {
              if ($xetable.findRowIndexOf(treeIndeterminates, row) === -1) {
                treeIndeterminates.push(row)
              }
              XEUtils.set(row, checkField, false)
            } else {
              // ?????????????????????
              XEUtils.eachTree([row], (item) => {
                if ($xetable.eqRow(item, row) || (!checkMethod || checkMethod({ row: item }))) {
                  XEUtils.set(item, checkField, value)
                  XEUtils.remove(treeIndeterminates, half => $xetable.eqRow(half, item))
                  handleCheckboxReserveRow(row, value)
                }
              }, treeOpts)
            }
            // ?????????????????????????????????????????????
            const matchObj = XEUtils.findTree(afterFullData, item => $xetable.eqRow(item, row), treeOpts)
            if (matchObj && matchObj.parent) {
              let parentStatus
              const vItems = checkMethod ? matchObj.items.filter((item) => checkMethod({ row: item })) : matchObj.items
              const indeterminatesItem = XEUtils.find(matchObj.items, item => $xetable.findRowIndexOf(treeIndeterminates, item) > -1)
              if (indeterminatesItem) {
                parentStatus = -1
              } else {
                const selectItems = matchObj.items.filter(item => XEUtils.get(item, checkField))
                parentStatus = selectItems.filter(item => $xetable.findRowIndexOf(vItems, item) > -1).length === vItems.length ? true : (selectItems.length || value === -1 ? -1 : false)
              }
              return tablePrivateMethods.handleSelectRow({ row: matchObj.parent }, parentStatus)
            }
          } else {
            if (!checkMethod || checkMethod({ row })) {
              XEUtils.set(row, checkField, value)
              handleCheckboxReserveRow(row, value)
            }
          }
        } else {
          if (treeConfig && !checkStrictly) {
            if (value === -1) {
              if ($xetable.findRowIndexOf(treeIndeterminates, row) === -1) {
                treeIndeterminates.push(row)
              }
              XEUtils.remove(selection, item => $xetable.eqRow(item, row))
            } else {
              // ?????????????????????
              XEUtils.eachTree([row], (item) => {
                if ($xetable.eqRow(item, row) || (!checkMethod || checkMethod({ row: item }))) {
                  if (value) {
                    selection.push(item)
                  } else {
                    XEUtils.remove(selection, select => $xetable.eqRow(select, item))
                  }
                  XEUtils.remove(treeIndeterminates, half => $xetable.eqRow(half, item))
                  handleCheckboxReserveRow(row, value)
                }
              }, treeOpts)
            }
            // ?????????????????????????????????????????????
            const matchObj = XEUtils.findTree(afterFullData, item => $xetable.eqRow(item, row), treeOpts)
            if (matchObj && matchObj.parent) {
              let parentStatus
              const vItems = checkMethod ? matchObj.items.filter((item) => checkMethod({ row: item })) : matchObj.items
              const indeterminatesItem = XEUtils.find(matchObj.items, item => $xetable.findRowIndexOf(treeIndeterminates, item) > -1)
              if (indeterminatesItem) {
                parentStatus = -1
              } else {
                const selectItems = matchObj.items.filter(item => $xetable.findRowIndexOf(selection, item) > -1)
                parentStatus = selectItems.filter(item => $xetable.findRowIndexOf(vItems, item) > -1).length === vItems.length ? true : (selectItems.length || value === -1 ? -1 : false)
              }
              return tablePrivateMethods.handleSelectRow({ row: matchObj.parent }, parentStatus)
            }
          } else {
            if (!checkMethod || checkMethod({ row })) {
              if (value) {
                if ($xetable.findRowIndexOf(selection, row) === -1) {
                  selection.push(row)
                }
              } else {
                XEUtils.remove(selection, item => $xetable.eqRow(item, row))
              }
              handleCheckboxReserveRow(row, value)
            }
          }
        }
        tablePrivateMethods.checkSelectionStatus()
      },
      triggerHeaderHelpEvent (evnt, params) {
        const { column } = params
        const titlePrefix = column.titlePrefix || column.titleHelp
        if (titlePrefix.content || titlePrefix.message) {
          const { tooltipStore } = reactData
          const content = getFuncText(titlePrefix.content || titlePrefix.message)
          handleTargetEnterEvent(true)
          tooltipStore.visible = true
          tooltipStore.currOpts = { ...titlePrefix, content: null }
          nextTick(() => {
            const $tooltip = refTooltip.value
            if ($tooltip) {
              $tooltip.open(evnt.currentTarget, content)
            }
          })
        }
      },
      /**
       * ???????????? tooltip ??????
       */
      triggerHeaderTooltipEvent (evnt, params) {
        const { tooltipStore } = reactData
        const { column } = params
        const titleElem = evnt.currentTarget
        handleTargetEnterEvent(true)
        if (tooltipStore.column !== column || !tooltipStore.visible) {
          handleTooltip(evnt, titleElem, titleElem, null, params)
        }
      },
      /**
       * ??????????????? tooltip ??????
       */
      triggerBodyTooltipEvent (evnt, params) {
        const { editConfig } = props
        const { editStore } = reactData
        const { tooltipStore } = reactData
        const editOpts = computeEditOpts.value
        const { actived } = editStore
        const { row, column } = params
        const cell = evnt.currentTarget as HTMLTableCellElement
        handleTargetEnterEvent(tooltipStore.column !== column || tooltipStore.row !== row)
        if (isEnableConf(editConfig)) {
          if ((editOpts.mode === 'row' && actived.row === row) || (actived.row === row && actived.column === column)) {
            return
          }
        }
        if (tooltipStore.column !== column || tooltipStore.row !== row || !tooltipStore.visible) {
          let overflowElem
          let tipElem
          if (column.treeNode) {
            overflowElem = cell.querySelector('.vxe-tree-cell')
            if (column.type === 'html') {
              tipElem = cell.querySelector('.vxe-cell--html')
            }
          } else {
            tipElem = cell.querySelector(column.type === 'html' ? '.vxe-cell--html' : '.vxe-cell--label')
          }
          handleTooltip(evnt, cell, overflowElem || cell.children[0], tipElem, params)
        }
      },
      /**
       * ???????????? tooltip ??????
       */
      triggerFooterTooltipEvent (evnt, params) {
        const { column } = params
        const { tooltipStore } = reactData
        const cell = evnt.currentTarget as HTMLTableCellElement
        handleTargetEnterEvent(tooltipStore.column !== column || tooltipStore.row)
        if (tooltipStore.column !== column || !tooltipStore.visible) {
          handleTooltip(evnt, cell, cell.querySelector('.vxe-cell--item') || cell.children[0], null, params)
        }
      },
      handleTargetLeaveEvent () {
        const tooltipOpts = computeTooltipOpts.value
        let $tooltip = refTooltip.value
        if ($tooltip) {
          $tooltip.setActived(false)
        }
        if (tooltipOpts.enterable) {
          internalData.tooltipTimeout = setTimeout(() => {
            $tooltip = refTooltip.value
            if ($tooltip && !$tooltip.isActived()) {
              tableMethods.closeTooltip()
            }
          }, tooltipOpts.leaveDelay)
        } else {
          tableMethods.closeTooltip()
        }
      },
      triggerHeaderCellClickEvent (evnt, params) {
        const { _lastResizeTime } = internalData
        const sortOpts = computeSortOpts.value
        const columnOpts = computeColumnOpts.value
        const { column } = params
        const cell = evnt.currentTarget
        const triggerResizable = _lastResizeTime && _lastResizeTime > Date.now() - 300
        const triggerSort = getEventTargetNode(evnt, cell, 'vxe-cell--sort').flag
        const triggerFilter = getEventTargetNode(evnt, cell, 'vxe-cell--filter').flag
        if (sortOpts.trigger === 'cell' && !(triggerResizable || triggerSort || triggerFilter)) {
          tablePrivateMethods.triggerSortEvent(evnt, column, getNextSortOrder(column))
        }
        tableMethods.dispatchEvent('header-cell-click', Object.assign({ triggerResizable, triggerSort, triggerFilter, cell }, params), evnt)
        if (columnOpts.isCurrent || props.highlightCurrentColumn) {
          tableMethods.setCurrentColumn(column)
        }
      },
      triggerHeaderCellDblclickEvent (evnt, params) {
        tableMethods.dispatchEvent('header-cell-dblclick', Object.assign({ cell: evnt.currentTarget }, params), evnt)
      },
      /**
       * ???????????????
       * ????????????????????????????????????????????????
       * ????????????????????????????????????????????????
       */
      triggerCellClickEvent (evnt, params) {
        const { highlightCurrentRow, editConfig } = props
        const { editStore } = reactData
        const expandOpts = computeExpandOpts.value
        const editOpts = computeEditOpts.value
        const treeOpts = computeTreeOpts.value
        const radioOpts = computeRadioOpts.value
        const checkboxOpts = computeCheckboxOpts.value
        const rowOpts = computeRowOpts.value
        const { actived } = editStore
        const { row, column } = params
        const { type, treeNode } = column
        const isRadioType = type === 'radio'
        const isCheckboxType = type === 'checkbox'
        const isExpandType = type === 'expand'
        const cell = evnt.currentTarget
        const triggerRadio = isRadioType && getEventTargetNode(evnt, cell, 'vxe-cell--radio').flag
        const triggerCheckbox = isCheckboxType && getEventTargetNode(evnt, cell, 'vxe-cell--checkbox').flag
        const triggerTreeNode = treeNode && getEventTargetNode(evnt, cell, 'vxe-tree--btn-wrapper').flag
        const triggerExpandNode = isExpandType && getEventTargetNode(evnt, cell, 'vxe-table--expanded').flag
        params = Object.assign({ cell, triggerRadio, triggerCheckbox, triggerTreeNode, triggerExpandNode }, params)
        if (!triggerCheckbox && !triggerRadio) {
          // ??????????????????
          if (!triggerExpandNode && (expandOpts.trigger === 'row' || (isExpandType && expandOpts.trigger === 'cell'))) {
            tablePrivateMethods.triggerRowExpandEvent(evnt, params)
          }
          // ?????????????????????
          if ((treeOpts.trigger === 'row' || (treeNode && treeOpts.trigger === 'cell'))) {
            tablePrivateMethods.triggerTreeExpandEvent(evnt, params)
          }
        }
        // ????????????????????????
        if (!triggerTreeNode) {
          if (!triggerExpandNode) {
            // ??????????????????
            if (rowOpts.isCurrent || highlightCurrentRow) {
              if (!triggerCheckbox && !triggerRadio) {
                tablePrivateMethods.triggerCurrentRowEvent(evnt, params)
              }
            }
            // ??????????????????
            if (!triggerRadio && (radioOpts.trigger === 'row' || (isRadioType && radioOpts.trigger === 'cell'))) {
              tablePrivateMethods.triggerRadioRowEvent(evnt, params)
            }
            // ??????????????????
            if (!triggerCheckbox && (checkboxOpts.trigger === 'row' || (isCheckboxType && checkboxOpts.trigger === 'cell'))) {
              tablePrivateMethods.handleToggleCheckRowEvent(evnt, params)
            }
          }
          // ?????????????????????????????????????????????????????????????????????????????????????????????????????????
          if (isEnableConf(editConfig)) {
            if (editOpts.trigger === 'manual') {
              if (actived.args && actived.row === row && column !== actived.column) {
                handleChangeCell(evnt, params)
              }
            } else if (!actived.args || row !== actived.row || column !== actived.column) {
              if (editOpts.trigger === 'click') {
                handleChangeCell(evnt, params)
              } else if (editOpts.trigger === 'dblclick') {
                if (editOpts.mode === 'row' && actived.row === row) {
                  handleChangeCell(evnt, params)
                }
              }
            }
          }
        }
        tableMethods.dispatchEvent('cell-click', params, evnt)
      },
      /**
       * ?????????????????????
       * ????????????????????????????????????????????????
       */
      triggerCellDblclickEvent (evnt, params) {
        const { editConfig } = props
        const { editStore } = reactData
        const editOpts = computeEditOpts.value
        const { actived } = editStore
        const cell = evnt.currentTarget
        params = Object.assign({ cell }, params)
        if (isEnableConf(editConfig) && editOpts.trigger === 'dblclick') {
          if (!actived.args || evnt.currentTarget !== actived.args.cell) {
            if (editOpts.mode === 'row') {
              checkValidate('blur')
                .catch((e: any) => e)
                .then(() => {
                  $xetable.handleActived(params, evnt)
                    .then(() => checkValidate('change'))
                    .catch((e: any) => e)
                })
            } else if (editOpts.mode === 'cell') {
              $xetable.handleActived(params, evnt)
                .then(() => checkValidate('change'))
                .catch((e: any) => e)
            }
          }
        }
        tableMethods.dispatchEvent('cell-dblclick', params, evnt)
      },
      handleToggleCheckRowEvent (evnt, params) {
        const { selection } = reactData
        const checkboxOpts = computeCheckboxOpts.value
        const { checkField } = checkboxOpts
        const { row } = params
        const value = checkField ? !XEUtils.get(row, checkField) : $xetable.findRowIndexOf(selection, row) === -1
        if (evnt) {
          tablePrivateMethods.triggerCheckRowEvent(evnt, params, value)
        } else {
          tablePrivateMethods.handleSelectRow(params, value)
        }
      },
      triggerCheckRowEvent (evnt, params, value) {
        const checkboxOpts = computeCheckboxOpts.value
        const { checkMethod } = checkboxOpts
        if (!checkMethod || checkMethod({ row: params.row })) {
          tablePrivateMethods.handleSelectRow(params, value)
          tableMethods.dispatchEvent('checkbox-change', Object.assign({
            records: tableMethods.getCheckboxRecords(),
            reserves: tableMethods.getCheckboxReserveRecords(),
            indeterminates: tableMethods.getCheckboxIndeterminateRecords(),
            checked: value
          }, params), evnt)
        }
      },
      /**
       * ???????????????????????????
       */
      triggerCheckAllEvent (evnt, value) {
        tableMethods.setAllCheckboxRow(value)
        if (evnt) {
          tableMethods.dispatchEvent('checkbox-all', {
            records: tableMethods.getCheckboxRecords(),
            reserves: tableMethods.getCheckboxReserveRecords(),
            indeterminates: tableMethods.getCheckboxIndeterminateRecords(),
            checked: value
          }, evnt)
        }
      },
      /**
       * ????????????????????????
       */
      triggerRadioRowEvent (evnt, params) {
        const { selectRow: oldValue } = reactData
        const { row } = params
        const radioOpts = computeRadioOpts.value
        let newValue = row
        let isChange = oldValue !== newValue
        if (isChange) {
          tableMethods.setRadioRow(newValue)
        } else if (!radioOpts.strict) {
          isChange = oldValue === newValue
          if (isChange) {
            newValue = null
            tableMethods.clearRadioRow()
          }
        }
        if (isChange) {
          tableMethods.dispatchEvent('radio-change', { oldValue, newValue, ...params }, evnt)
        }
      },
      triggerCurrentRowEvent (evnt, params) {
        const { currentRow: oldValue } = reactData
        const { row: newValue } = params
        const isChange = oldValue !== newValue
        tableMethods.setCurrentRow(newValue)
        if (isChange) {
          tableMethods.dispatchEvent('current-change', { oldValue, newValue, ...params }, evnt)
        }
      },
      /**
       * ???????????????
       */
      triggerRowExpandEvent (evnt, params) {
        const { expandLazyLoadeds, expandColumn: column } = reactData
        const expandOpts = computeExpandOpts.value
        const { row } = params
        const { lazy } = expandOpts
        if (!lazy || $xetable.findRowIndexOf(expandLazyLoadeds, row) === -1) {
          const expanded = !tableMethods.isExpandByRow(row)
          const columnIndex = tableMethods.getColumnIndex(column)
          const $columnIndex = tableMethods.getVMColumnIndex(column)
          tableMethods.setRowExpand(row, expanded)
          tableMethods.dispatchEvent('toggle-row-expand', {
            expanded,
            column,
            columnIndex,
            $columnIndex,
            row,
            rowIndex: tableMethods.getRowIndex(row),
            $rowIndex: tableMethods.getVMRowIndex(row)
          }, evnt)
        }
      },
      /**
       * ?????????????????????
       */
      triggerTreeExpandEvent (evnt, params) {
        const { treeLazyLoadeds } = reactData
        const treeOpts = computeTreeOpts.value
        const { row, column } = params
        const { lazy } = treeOpts
        if (!lazy || $xetable.findRowIndexOf(treeLazyLoadeds, row) === -1) {
          const expanded = !tableMethods.isTreeExpandByRow(row)
          const columnIndex = tableMethods.getColumnIndex(column)
          const $columnIndex = tableMethods.getVMColumnIndex(column)
          tableMethods.setTreeExpand(row, expanded)
          tableMethods.dispatchEvent('toggle-tree-expand', { expanded, column, columnIndex, $columnIndex, row }, evnt)
        }
      },
      /**
       * ??????????????????
       */
      triggerSortEvent (evnt, column, order) {
        const sortOpts = computeSortOpts.value
        const { field, sortable } = column
        if (sortable) {
          if (!order || column.order === order) {
            tableMethods.clearSort(sortOpts.multiple ? column : null)
          } else {
            tableMethods.sort({ field, order })
          }
          const params = { column, field, property: field, order: column.order, sortList: tableMethods.getSortColumns() }
          tableMethods.dispatchEvent('sort-change', params, evnt)
        }
      },
      /**
       * ?????? X ????????????????????????
       */
      triggerScrollXEvent () {
        loadScrollXData()
      },
      /**
       * ?????? Y ????????????????????????
       */
      triggerScrollYEvent (evnt) {
        const { scrollYStore } = internalData
        const { adaptive, offsetSize, visibleSize } = scrollYStore
        // webkit ????????????????????????????????????????????????????????????????????? 40 ???
        if (isWebkit && adaptive && (offsetSize * 2 + visibleSize) <= 40) {
          loadScrollYData(evnt)
        } else {
          debounceScrollY(evnt)
        }
      },
      /**
       * ??????????????????????????????????????????????????????????????????
       * ????????????????????????????????????????????????????????????????????????
       * @param {Row} row ?????????
       */
      scrollToTreeRow (row) {
        const { treeConfig } = props
        const { tableFullData } = internalData
        const rests: Promise<any>[] = []
        if (treeConfig) {
          const treeOpts = computeTreeOpts.value
          const matchObj = XEUtils.findTree(tableFullData, item => $xetable.eqRow(item, row), treeOpts)
          if (matchObj) {
            const nodes = matchObj.nodes
            nodes.forEach((row, index) => {
              if (index < nodes.length - 1 && !tableMethods.isTreeExpandByRow(row)) {
                rests.push(tableMethods.setTreeExpand(row, true))
              }
            })
          }
        }
        return Promise.all(rests).then(() => rowToVisible($xetable, row))
      },
      // ???????????? X ????????????????????????????????????
      updateScrollXSpace () {
        const { scrollXLoad, scrollbarWidth } = reactData
        const { visibleColumn, scrollXStore, elemStore, tableWidth } = internalData
        const tableHeader = refTableHeader.value
        const tableBody = refTableBody.value
        const tableFooter = refTableFooter.value
        const tableBodyElem = tableBody ? tableBody.$el as HTMLDivElement : null
        if (tableBodyElem) {
          const tableHeaderElem = tableHeader ? tableHeader.$el as HTMLDivElement : null
          const tableFooterElem = tableFooter ? tableFooter.$el as HTMLDivElement : null
          const headerElem = tableHeaderElem ? tableHeaderElem.querySelector('.vxe-table--header') as HTMLTableElement : null
          const bodyElem = tableBodyElem.querySelector('.vxe-table--body') as HTMLTableElement
          const footerElem = tableFooterElem ? tableFooterElem.querySelector('.vxe-table--footer') as HTMLTableElement : null
          const leftSpaceWidth = visibleColumn.slice(0, scrollXStore.startIndex).reduce((previous, column) => previous + column.renderWidth, 0)
          let marginLeft = ''
          if (scrollXLoad) {
            marginLeft = `${leftSpaceWidth}px`
          }
          if (headerElem) {
            headerElem.style.marginLeft = marginLeft
          }
          bodyElem.style.marginLeft = marginLeft
          if (footerElem) {
            footerElem.style.marginLeft = marginLeft
          }
          const containerList = ['main']
          containerList.forEach(name => {
            const layoutList = ['header', 'body', 'footer']
            layoutList.forEach(layout => {
              const xSpaceRef = elemStore[`${name}-${layout}-xSpace`]
              const xSpaceElem = xSpaceRef ? xSpaceRef.value : null
              if (xSpaceElem) {
                xSpaceElem.style.width = scrollXLoad ? `${tableWidth + (layout === 'header' ? scrollbarWidth : 0)}px` : ''
              }
            })
          })
          nextTick(updateStyle)
        }
      },
      // ???????????? Y ????????????????????????????????????
      updateScrollYSpace () {
        const { scrollYLoad } = reactData
        const { scrollYStore, elemStore, afterFullData } = internalData
        const { startIndex, rowHeight } = scrollYStore
        const bodyHeight = afterFullData.length * rowHeight
        const topSpaceHeight = Math.max(0, startIndex * rowHeight)
        const containerList = ['main', 'left', 'right']
        let marginTop = ''
        let ySpaceHeight = ''
        if (scrollYLoad) {
          marginTop = `${topSpaceHeight}px`
          ySpaceHeight = `${bodyHeight}px`
        }
        containerList.forEach(name => {
          const layoutList = ['header', 'body', 'footer']
          const tableRef = elemStore[`${name}-body-table`]
          const tableElem = tableRef ? tableRef.value : null
          if (tableElem) {
            tableElem.style.marginTop = marginTop
          }
          layoutList.forEach(layout => {
            const ySpaceRef = elemStore[`${name}-${layout}-ySpace`]
            const ySpaceElem = ySpaceRef ? ySpaceRef.value : null
            if (ySpaceElem) {
              ySpaceElem.style.height = ySpaceHeight
            }
          })
        })
        nextTick(updateStyle)
      },
      updateScrollXData () {
        // reactData.tableColumn = []
        nextTick(() => {
          handleTableColumn()
          tablePrivateMethods.updateScrollXSpace()
        })
      },
      updateScrollYData () {
        // reactData.tableData = []
        nextTick(() => {
          tablePrivateMethods.handleTableData()
          tablePrivateMethods.updateScrollYSpace()
        })
      },
      /**
       * ??????????????????????????????
       */
      checkScrolling () {
        const leftContainerElem = refLeftContainer.value
        const rightContainerElem = refRightContainer.value
        const tableBody = refTableBody.value
        const bodyElem = tableBody ? tableBody.$el as HTMLDivElement : null
        if (bodyElem) {
          if (leftContainerElem) {
            if (bodyElem.scrollLeft > 0) {
              addClass(leftContainerElem, 'scrolling--middle')
            } else {
              removeClass(leftContainerElem, 'scrolling--middle')
            }
          }
          if (rightContainerElem) {
            if (bodyElem.clientWidth < bodyElem.scrollWidth - Math.ceil(bodyElem.scrollLeft)) {
              addClass(rightContainerElem, 'scrolling--middle')
            } else {
              removeClass(rightContainerElem, 'scrolling--middle')
            }
          }
        }
      },
      updateZindex () {
        if (props.zIndex) {
          internalData.tZindex = props.zIndex
        } else if (internalData.tZindex < getLastZIndex()) {
          internalData.tZindex = nextZIndex()
        }
      },
      updateCellAreas () {
        const { mouseConfig } = props
        const mouseOpts = computeMouseOpts.value
        if (mouseConfig && mouseOpts.area && $xetable.handleUpdateCellAreas) {
          $xetable.handleUpdateCellAreas()
        }
      },
      /**
       * ??? hover ??????
       */
      triggerHoverEvent (evnt, { row }) {
        tablePrivateMethods.setHoverRow(row)
      },
      setHoverRow (row) {
        const rowid = getRowid($xetable, row)
        const el = refElem.value
        tablePrivateMethods.clearHoverRow()
        if (el) {
          XEUtils.arrayEach(el.querySelectorAll(`[rowid="${rowid}"]`), elem => addClass(elem, 'row--hover'))
        }
        internalData.hoverRow = row
      },
      clearHoverRow () {
        const el = refElem.value
        if (el) {
          XEUtils.arrayEach(el.querySelectorAll('.vxe-body--row.row--hover'), elem => removeClass(elem, 'row--hover'))
        }
        internalData.hoverRow = null
      },
      getCell (row, column) {
        const rowid = getRowid($xetable, row)
        const tableBody = refTableBody.value
        const leftBody = refTableLeftBody.value
        const rightBody = refTableRightBody.value
        let bodyElem
        if (column.fixed) {
          if (column.fixed === 'left') {
            if (leftBody) {
              bodyElem = leftBody.$el as HTMLDivElement
            }
          } else {
            if (rightBody) {
              bodyElem = rightBody.$el as HTMLDivElement
            }
          }
        }
        if (!bodyElem) {
          bodyElem = tableBody.$el as HTMLDivElement
        }
        if (bodyElem) {
          return bodyElem.querySelector(`.vxe-body--row[rowid="${rowid}"] .${column.id}`)
        }
        return null
      },
      getCellLabel (row, column) {
        const formatter = column.formatter
        const cellValue = getCellValue(row, column)
        let cellLabel = cellValue
        if (formatter) {
          let formatData
          const { fullAllDataRowIdData } = internalData
          const rowid = getRowid($xetable, row)
          const colid = column.id
          const rest = fullAllDataRowIdData[rowid]
          if (rest) {
            formatData = rest.formatData
            if (!formatData) {
              formatData = fullAllDataRowIdData[rowid].formatData = {}
            }
            if (rest && formatData[colid]) {
              if (formatData[colid].value === cellValue) {
                return formatData[colid].label
              }
            }
          }
          const formatParams = { cellValue, row, rowIndex: tableMethods.getRowIndex(row), column, columnIndex: tableMethods.getColumnIndex(column) }
          if (XEUtils.isString(formatter)) {
            const globalFunc = VXETable.formats.get(formatter)
            cellLabel = globalFunc ? globalFunc(formatParams) : ''
          } else if (XEUtils.isArray(formatter)) {
            const globalFunc = VXETable.formats.get(formatter[0])
            cellLabel = globalFunc ? globalFunc(formatParams, ...formatter.slice(1)) : ''
          } else {
            cellLabel = formatter(formatParams)
          }
          if (formatData) {
            formatData[colid] = { value: cellValue, label: cellLabel }
          }
        }
        return cellLabel
      },
      findRowIndexOf (list, row) {
        return row ? XEUtils.findIndexOf(list, item => $xetable.eqRow(item, row)) : -1
      },
      eqRow (row1, row2) {
        if (row1 && row2) {
          if (row1 === row2) {
            return true
          }
          return getRowid($xetable, row1) === getRowid($xetable, row2)
        }
        return false
      }
    }

    // ??????????????????????????????
    if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
      'openExport,openPrint,exportData,openImport,importData,saveFile,readFile,importByFile,print'.split(',').forEach(name => {
        ($xetable as any)[name] = function () {
          errLog('vxe.error.reqModule', ['Export'])
        }
      })
      'clearValidate,fullValidate,validate'.split(',').forEach(name => {
        ($xetable as any)[name] = function () {
          errLog('vxe.error.reqModule', ['Validator'])
        }
      })
    }

    Object.assign($xetable, tableMethods, tablePrivateMethods)

    /**
     * ??????????????????
     * ?????????????????????????????????????????????
     * ?????????????????????????????????????????????????????????
     * @param {String} fixedType ???????????????
     */
    const renderFixed = (fixedType: 'left' | 'right') => {
      const { showHeader, showFooter } = props
      const { tableData, tableColumn, useCustomHeaderRowSpan, tableGroupColumn, columnStore, footerTableData } = reactData
      const isFixedLeft = fixedType === 'left'
      const fixedColumn = isFixedLeft ? columnStore.leftList : columnStore.rightList
      return h('div', {
        ref: isFixedLeft ? refLeftContainer : refRightContainer,
        class: `vxe-table--fixed-${fixedType}-wrapper`
      }, [
        showHeader ? h(TableHeaderComponent, {
          ref: isFixedLeft ? refTableLeftHeader : refTableRightHeader,
          fixedType,
          useCustomHeaderRowSpan,
          tableData,
          tableColumn,
          tableGroupColumn,
          fixedColumn
        }) : createCommentVNode(),
        h(TableBodyComponent as ComponentOptions, {
          ref: isFixedLeft ? refTableLeftBody : refTableRightBody,
          fixedType,
          tableData,
          tableColumn,
          fixedColumn
        }),
        showFooter ? h(TableFooterComponent, {
          ref: isFixedLeft ? refTableLeftFooter : refTableRightFooter,
          footerTableData,
          tableColumn,
          fixedColumn,
          fixedType
        }) : createCommentVNode()
      ])
    }

    const renderEmptyContenet = () => {
      const emptyOpts = computeEmptyOpts.value
      const params = { $table: $xetable }
      if (slots.empty) {
        return slots.empty(params)
      } else {
        const compConf = emptyOpts.name ? VXETable.renderer.get(emptyOpts.name) : null
        const renderEmpty = compConf ? compConf.renderEmpty : null
        if (renderEmpty) {
          return renderEmpty(emptyOpts, params)
        }
      }
      return getFuncText(props.emptyText) || GlobalConfig.i18n('vxe.table.emptyText')
    }

    function handleUupdateResize () {
      const el = refElem.value
      if (el && el.clientWidth && el.clientHeight) {
        tableMethods.recalculate()
      }
    }

    watch(() => props.data, (value) => {
      const { inited, initStatus } = internalData
      loadTableData(value || []).then(() => {
        const { scrollXLoad, scrollYLoad, expandColumn } = reactData
        internalData.inited = true
        internalData.initStatus = true
        if (!initStatus) {
          handleLoadDefaults()
        }
        if (!inited) {
          handleInitDefaults()
        }
        if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
          if ((scrollXLoad || scrollYLoad) && expandColumn) {
            warnLog('vxe.error.scrollErrProp', ['column.type=expand'])
          }
        }
        tableMethods.recalculate()
      })
    })

    watch(() => reactData.staticColumns, (value) => {
      handleColumn(value)
    })

    watch(() => reactData.tableColumn, () => {
      tablePrivateMethods.analyColumnWidth()
    })

    watch(() => props.showHeader, () => {
      nextTick(() => {
        tableMethods.recalculate(true).then(() => tableMethods.refreshScroll())
      })
    })

    watch(() => props.showFooter, () => {
      nextTick(() => {
        tableMethods.recalculate(true).then(() => tableMethods.refreshScroll())
      })
    })

    watch(() => props.height, () => {
      nextTick(() => tableMethods.recalculate(true))
    })

    watch(() => props.maxHeight, () => {
      nextTick(() => tableMethods.recalculate(true))
    })

    watch(() => props.syncResize, (value) => {
      if (value) {
        handleUupdateResize()
        nextTick(() => {
          handleUupdateResize()
          setTimeout(() => handleUupdateResize())
        })
      }
    })

    watch(() => props.mergeCells, (value) => {
      tableMethods.clearMergeCells()
      nextTick(() => {
        if (value) {
          tableMethods.setMergeCells(value)
        }
      })
    })

    watch(() => props.mergeFooterItems, (value) => {
      tableMethods.clearMergeFooterItems()
      nextTick(() => {
        if (value) {
          tableMethods.setMergeFooterItems(value)
        }
      })
    })

    VXETable.hooks.forEach((options) => {
      const { setupTable } = options
      if (setupTable) {
        const hookRest = setupTable($xetable)
        if (hookRest && XEUtils.isObject(hookRest)) {
          Object.assign($xetable, hookRest)
        }
      }
    })

    tablePrivateMethods.preventEvent(null, 'created', { $table: $xetable })

    let resizeObserver: XEResizeObserver

    onActivated(() => {
      tableMethods.recalculate().then(() => tableMethods.refreshScroll())
      tablePrivateMethods.preventEvent(null, 'activated', { $table: $xetable })
    })

    onDeactivated(() => {
      internalData.isActivated = false
      tablePrivateMethods.preventEvent(null, 'deactivated', { $table: $xetable })
    })

    onMounted(() => {
      nextTick(() => {
        const { data, treeConfig, showOverflow } = props
        const { scrollXStore, scrollYStore } = internalData
        const sYOpts = computeSYOpts.value
        const editOpts = computeEditOpts.value
        const treeOpts = computeTreeOpts.value
        const radioOpts = computeRadioOpts.value
        const checkboxOpts = computeCheckboxOpts.value
        const expandOpts = computeExpandOpts.value
        const rowOpts = computeRowOpts.value

        if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
          // if (props.rowId) {
          //   warnLog('vxe.error.delProp', ['row-id', 'row-config.keyField'])
          // }
          // if (props.rowKey) {
          //   warnLog('vxe.error.delProp', ['row-id', 'row-config.useKey'])
          // }
          // if (props.columnKey) {
          //   warnLog('vxe.error.delProp', ['row-id', 'column-config.useKey'])
          // }
          if (!(props.rowId || rowOpts.keyField) && (checkboxOpts.reserve || checkboxOpts.checkRowKeys || radioOpts.reserve || radioOpts.checkRowKey || expandOpts.expandRowKeys || treeOpts.expandRowKeys)) {
            warnLog('vxe.error.reqProp', ['row-config.keyField'])
          }
          if (props.editConfig && (editOpts.showStatus || editOpts.showUpdateStatus || editOpts.showInsertStatus) && !props.keepSource) {
            warnLog('vxe.error.reqProp', ['keep-source'])
          }
          if (treeConfig && treeOpts.line && (!(props.rowKey || rowOpts.useKey) || !showOverflow)) {
            warnLog('vxe.error.reqProp', ['row-config.useKey | show-overflow'])
          }
          if (treeConfig && props.stripe) {
            warnLog('vxe.error.noTree', ['stripe'])
          }
          if (props.showFooter && !props.footerMethod) {
            warnLog('vxe.error.reqProp', ['footer-method'])
          }
          // if (props.highlightCurrentRow) {
          //   warnLog('vxe.error.delProp', ['highlight-current-row', 'row-config.isCurrent'])
          // }
          // if (props.highlightHoverRow) {
          //   warnLog('vxe.error.delProp', ['highlight-hover-row', 'row-config.isHover'])
          // }
          // if (props.highlightCurrentColumn) {
          //   warnLog('vxe.error.delProp', ['highlight-current-column', 'column-config.isCurrent'])
          // }
          // if (props.highlightHoverColumn) {
          //   warnLog('vxe.error.delProp', ['highlight-hover-column', 'column-config.isHover'])
          // }
          // ?????????????????????????????????????????????????????????????????????????????????
          const { exportConfig, importConfig } = props
          const exportOpts = computeExportOpts.value
          const importOpts = computeImportOpts.value
          if (importConfig && importOpts.types && !importOpts.importMethod && !XEUtils.includeArrays(VXETable.config.importTypes, importOpts.types)) {
            warnLog('vxe.error.errProp', [`export-config.types=${importOpts.types.join(',')}`, importOpts.types.filter((type: string) => XEUtils.includes(VXETable.config.importTypes, type)).join(',') || VXETable.config.importTypes.join(',')])
          }
          if (exportConfig && exportOpts.types && !exportOpts.exportMethod && !XEUtils.includeArrays(VXETable.config.exportTypes, exportOpts.types)) {
            warnLog('vxe.error.errProp', [`export-config.types=${exportOpts.types.join(',')}`, exportOpts.types.filter((type: string) => XEUtils.includes(VXETable.config.exportTypes, type)).join(',') || VXETable.config.exportTypes.join(',')])
          }
        }

        if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
          const customOpts = computeCustomOpts.value
          const mouseOpts = computeMouseOpts.value
          const rowOpts = computeRowOpts.value
          if (!props.id && props.customConfig && (customOpts.storage === true || (customOpts.storage && customOpts.storage.resizable) || (customOpts.storage && customOpts.storage.visible))) {
            errLog('vxe.error.reqProp', ['id'])
          }
          if (props.treeConfig && checkboxOpts.range) {
            errLog('vxe.error.noTree', ['checkbox-config.range'])
          }
          if (rowOpts.height && !props.showOverflow) {
            warnLog('vxe.error.notProp', ['table.show-overflow'])
          }
          if (!$xetable.handleUpdateCellAreas) {
            if (props.clipConfig) {
              warnLog('vxe.error.notProp', ['clip-config'])
            }
            if (props.fnrConfig) {
              warnLog('vxe.error.notProp', ['fnr-config'])
            }
            if (mouseOpts.area) {
              errLog('vxe.error.notProp', ['mouse-config.area'])
              return
            }
          }
          if (mouseOpts.area && mouseOpts.selected) {
            warnLog('vxe.error.errConflicts', ['mouse-config.area', 'mouse-config.selected'])
          }
          if (mouseOpts.area && checkboxOpts.range) {
            warnLog('vxe.error.errConflicts', ['mouse-config.area', 'checkbox-config.range'])
          }
          if (props.treeConfig && mouseOpts.area) {
            errLog('vxe.error.noTree', ['mouse-config.area'])
          }
          // if (props.editConfig && props.editConfig.activeMethod) {
          //   warnLog('vxe.error.delProp', ['table.edit-config.activeMethod', 'table.edit-config.beforeEditMethod'])
          // }
        }

        // ????????????????????????????????????
        if (process.env.VUE_APP_VXE_TABLE_ENV === 'development') {
          if (props.editConfig && !$xetable.insert) {
            errLog('vxe.error.reqModule', ['Edit'])
          }
          if (props.editRules && !$xetable.validate) {
            errLog('vxe.error.reqModule', ['Validator'])
          }
          if ((checkboxOpts.range || props.keyboardConfig || props.mouseConfig) && !$xetable.triggerCellMousedownEvent) {
            errLog('vxe.error.reqModule', ['Keyboard'])
          }
          if ((props.printConfig || props.importConfig || props.exportConfig) && !$xetable.exportData) {
            errLog('vxe.error.reqModule', ['Export'])
          }
        }

        Object.assign(scrollYStore, {
          startIndex: 0,
          endIndex: 0,
          visibleSize: 0,
          adaptive: sYOpts.adaptive !== false
        })
        Object.assign(scrollXStore, {
          startIndex: 0,
          endIndex: 0,
          visibleSize: 0
        })

        loadTableData(data || []).then(() => {
          if (data && data.length) {
            internalData.inited = true
            internalData.initStatus = true
            handleLoadDefaults()
            handleInitDefaults()
          }
          updateStyle()
        })

        if (props.autoResize) {
          const el = refElem.value
          const parentEl = tablePrivateMethods.getParentElem()
          resizeObserver = createResizeEvent(() => {
            if (props.autoResize) {
              tableMethods.recalculate(true)
            }
          })
          if (el) {
            resizeObserver.observe(el)
          }
          if (parentEl) {
            resizeObserver.observe(parentEl)
          }
        }
      })
      GlobalEvent.on($xetable, 'paste', handleGlobalPasteEvent)
      GlobalEvent.on($xetable, 'copy', handleGlobalCopyEvent)
      GlobalEvent.on($xetable, 'cut', handleGlobalCutEvent)
      GlobalEvent.on($xetable, 'mousedown', handleGlobalMousedownEvent)
      GlobalEvent.on($xetable, 'blur', handleGlobalBlurEvent)
      GlobalEvent.on($xetable, 'mousewheel', handleGlobalMousewheelEvent)
      GlobalEvent.on($xetable, 'keydown', handleGlobalKeydownEvent)
      GlobalEvent.on($xetable, 'resize', handleGlobalResizeEvent)
      if ($xetable.handleGlobalContextmenuEvent) {
        GlobalEvent.on($xetable, 'contextmenu', $xetable.handleGlobalContextmenuEvent)
      }
      tablePrivateMethods.preventEvent(null, 'mounted', { $table: $xetable })
    })

    onBeforeUnmount(() => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      tableMethods.closeFilter()
      if ($xetable.closeMenu) {
        $xetable.closeMenu()
      }
      tablePrivateMethods.preventEvent(null, 'beforeUnmount', { $table: $xetable })
    })

    onUnmounted(() => {
      GlobalEvent.off($xetable, 'paste')
      GlobalEvent.off($xetable, 'copy')
      GlobalEvent.off($xetable, 'cut')
      GlobalEvent.off($xetable, 'mousedown')
      GlobalEvent.off($xetable, 'blur')
      GlobalEvent.off($xetable, 'mousewheel')
      GlobalEvent.off($xetable, 'keydown')
      GlobalEvent.off($xetable, 'resize')
      GlobalEvent.off($xetable, 'contextmenu')
      tablePrivateMethods.preventEvent(null, 'unmounted', { $table: $xetable })
    })

    const renderVN = () => {
      const { loading, stripe, showHeader, height, treeConfig, mouseConfig, showFooter, highlightCell, highlightHoverRow, highlightHoverColumn, editConfig } = props
      const { isGroup, useCustomHeaderRowSpan, overflowX, overflowY, scrollXLoad, scrollYLoad, scrollbarHeight, tableData, tableColumn, tableGroupColumn, footerTableData, initStore, columnStore, filterStore } = reactData
      const { leftList, rightList } = columnStore
      const tipConfig = computeTipConfig.value
      const treeOpts = computeTreeOpts.value
      const rowOpts = computeRowOpts.value
      const columnOpts = computeColumnOpts.value
      const vSize = computeSize.value
      const tableBorder = computeTableBorder.value
      const mouseOpts = computeMouseOpts.value
      const validOpts = computeValidOpts.value
      const validTipOpts = computeValidTipOpts.value
      const isMenu = computeIsMenu.value
      return h('div', {
        ref: refElem,
        class: ['vxe-table', 'vxe-table--render-default', `tid_${xID}`, `border--${tableBorder}`, {
          [`size--${vSize}`]: vSize,
          'vxe-editable': !!editConfig,
          'cell--highlight': highlightCell,
          'cell--selected': mouseConfig && mouseOpts.selected,
          'cell--area': mouseConfig && mouseOpts.area,
          'row--highlight': rowOpts.isHover || highlightHoverRow,
          'column--highlight': columnOpts.isHover || highlightHoverColumn,
          'is--header': showHeader,
          'is--footer': showFooter,
          'is--group': isGroup,
          'is--tree-line': treeConfig && treeOpts.line,
          'is--fixed-left': leftList.length,
          'is--fixed-right': rightList.length,
          'is--animat': !!props.animat,
          'is--round': props.round,
          'is--stripe': !treeConfig && stripe,
          'is--loading': loading,
          'is--empty': !loading && !tableData.length,
          'is--scroll-y': overflowY,
          'is--scroll-x': overflowX,
          'is--virtual-x': scrollXLoad,
          'is--virtual-y': scrollYLoad
        }],
        onKeydown: keydownEvent
      }, [
        /**
         * ?????????
         */
        h('div', {
          class: 'vxe-table-slots'
        }, slots.default ? slots.default({}) : []),
        h('div', {
          class: 'vxe-table--render-wrapper'
        }, [
          h('div', {
            class: 'vxe-table--main-wrapper'
          }, [
            /**
             * ??????
             */
            showHeader ? h(TableHeaderComponent, {
              ref: refTableHeader,
              tableData,
              tableColumn,
              tableGroupColumn,
              useCustomHeaderRowSpan
            }) : createCommentVNode(),
            /**
             * ??????
             */
            h(TableBodyComponent as ComponentOptions, {
              ref: refTableBody,
              tableData,
              tableColumn
            }),
            /**
             * ??????
             */
            showFooter ? h(TableFooterComponent, {
              ref: refTableFooter,
              footerTableData,
              tableColumn
            }) : createCommentVNode()
          ]),
          h('div', {
            class: 'vxe-table--fixed-wrapper'
          }, [
            /**
             * ??????????????????
             */
            leftList && leftList.length && overflowX ? renderFixed('left') : createCommentVNode(),
            /**
             * ??????????????????
             */
            rightList && rightList.length && overflowX ? renderFixed('right') : createCommentVNode()
          ])
        ]),
        /**
         * ?????????
         */
        h('div', {
          ref: refEmptyPlaceholder,
          class: 'vxe-table--empty-placeholder'
        }, [
          h('div', {
            class: 'vxe-table--empty-content'
          }, renderEmptyContenet())
        ]),
        /**
         * ?????????
         */
        h('div', {
          class: 'vxe-table--border-line'
        }),
        /**
         * ?????????
         */
        h('div', {
          ref: refCellResizeBar,
          class: 'vxe-table--resizable-bar',
          style: overflowX ? {
            'padding-bottom': `${scrollbarHeight}px`
          } : null
        }),
        /**
         * ?????????
         */
        h(VxeLoading, {
          class: 'vxe-table--loading',
          loading
        }),
        /**
         * ??????
         */
        initStore.filter ? h(resolveComponent('vxe-table-filter') as ComponentOptions, {
          ref: refTableFilter,
          filterStore
        }) : createCommentVNode(),
        /**
         * ??????
         */
        initStore.import && props.importConfig ? h(resolveComponent('vxe-import-panel') as ComponentOptions, {
          defaultOptions: reactData.importParams,
          storeData: reactData.importStore
        }) : createCommentVNode(),
        /**
         * ??????/??????
         */
        initStore.export && (props.exportConfig || props.printConfig) ? h(resolveComponent('vxe-export-panel') as ComponentOptions, {
          defaultOptions: reactData.exportParams,
          storeData: reactData.exportStore
        }) : createCommentVNode(),
        /**
         * ????????????
         */
        isMenu ? h(resolveComponent('vxe-table-context-menu') as ComponentOptions, {
          ref: refTableMenu
        }) : createCommentVNode(),
        /**
         * ????????????
         */
        hasUseTooltip ? h(resolveComponent('vxe-tooltip') as ComponentOptions, {
          ref: refCommTooltip,
          isArrow: false,
          enterable: false
        }) : createCommentVNode(),
        /**
         * ????????????
         */
        hasUseTooltip && props.editRules && validOpts.showMessage && (validOpts.message === 'default' ? !height : validOpts.message === 'tooltip') ? h(resolveComponent('vxe-tooltip') as ComponentOptions, {
          ref: refValidTooltip,
          class: 'vxe-table--valid-error',
          ...(validOpts.message === 'tooltip' || tableData.length === 1 ? validTipOpts : {})
        }) : createCommentVNode(),
        /**
         * ????????????
         */
        hasUseTooltip ? h(resolveComponent('vxe-tooltip') as ComponentOptions, {
          ref: refTooltip,
          ...tipConfig
        }) : createCommentVNode()
      ])
    }

    $xetable.renderVN = renderVN

    provide('xecolgroup', null)
    provide('$xetable', $xetable)

    return $xetable
  },
  render () {
    return this.renderVN()
  }
})
