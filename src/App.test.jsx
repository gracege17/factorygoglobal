import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
})

const getField = (label) => screen.getByText(label, { selector: 'span' }).closest('label')
const getButtonByText = (container, text) =>
  within(container).getAllByRole('button').find((button) => button.textContent.trim() === text)

const fillBaseRequiredFields = async (user) => {
  await user.type(screen.getByPlaceholderText('例如：浙江某某实业有限公司'), '测试工厂')
  const categoryField = getField('主营产品/品类')
  const targetMarketField = getField('想重点开发的目标市场')
  const customerField = getField('您更想开发哪类客户？')
  const advantageField = getField('您觉得自己的核心竞争优势是？')
  await user.click(getButtonByText(categoryField, '纸制品'))
  await user.click(getButtonByText(targetMarketField, '北美'))
  await user.click(getButtonByText(customerField, '品牌商'))
  await user.click(getButtonByText(advantageField, '价格有优势'))
}

const goToStep2WithRequiredInputs = async (user, { exportExperience = 'none', currentMarkets = [] } = {}) => {
  await fillBaseRequiredFields(user)
  const exportField = getField('是否已有出口经验？')
  await user.click(getButtonByText(exportField, exportExperience === 'has' ? '有' : '暂无'))

  if (exportExperience === 'has') {
    const currentMarketField = getField('当前主要销售市场')
    for (const market of currentMarkets) {
      await user.click(getButtonByText(currentMarketField, market))
    }
  }

  await user.click(screen.getByRole('button', { name: '生成建议结果' }))
  await screen.findByText('第 2 步：推荐市场与定位建议')
}

const goToStep5 = async (user) => {
  await goToStep2WithRequiredInputs(user, { exportExperience: 'none' })
  await user.click(screen.getByRole('button', { name: '确认并进入下一步' }))
  await screen.findByText('第 3 步：客户意向确认')
  await user.click(screen.getByRole('button', { name: '确认市场并继续' }))
  await screen.findByText('第 4 步：出海成本概算')
  await user.click(screen.getByRole('button', { name: '进入物料生成' }))
  await screen.findByText('第 5 步：智能物料生成')
}

describe('App step 1 interactions', () => {
  test('allows continuing without current sales markets when export experience is none', async () => {
    const user = userEvent.setup()
    render(<App />)

    await fillBaseRequiredFields(user)
    await user.click(getButtonByText(getField('是否已有出口经验？'), '暂无'))
    await user.click(screen.getByRole('button', { name: '生成建议结果' }))

    expect(await screen.findByText('第 2 步：推荐市场与定位建议')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /查看本次建议的判断依据/ }))
    expect(screen.getByText('现有市场基础：暂未开展出口')).toBeInTheDocument()
  })

  test('requires current sales markets after export experience is set to yes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await fillBaseRequiredFields(user)
    await user.click(getButtonByText(getField('是否已有出口经验？'), '有'))
    await user.click(screen.getByRole('button', { name: '生成建议结果' }))

    expect(await screen.findByText('请选择当前主要销售市场。')).toBeInTheDocument()
    expect(screen.getByText('第 1 步：基本信息采集')).toBeInTheDocument()
  })

  test('keeps 暂不明确 mutually exclusive for target customers', async () => {
    const user = userEvent.setup()
    render(<App />)

    const customerField = getField('您更想开发哪类客户？')
    const clearButton = getButtonByText(customerField, '暂不明确')
    let brandButton = getButtonByText(customerField, '品牌商')

    await user.click(brandButton)
    expect(brandButton.className).toContain('text-white')

    await user.click(clearButton)

    await waitFor(() => {
      brandButton = getButtonByText(customerField, '品牌商')
      expect(clearButton.className).toContain('text-white')
      expect(brandButton.className).not.toContain('text-white')
    })
  })

  test('supports suggested plus custom product category tags', async () => {
    const user = userEvent.setup()
    render(<App />)

    const categoryField = getField('主营产品/品类')
    await user.click(getButtonByText(categoryField, '纸制品'))
    const input = screen.getByPlaceholderText('输入更具体品类，例如：抽纸、礼盒包装')
    await user.type(input, '礼盒包装')
    await user.click(getButtonByText(categoryField, '添加品类'))

    expect(getButtonByText(categoryField, '礼盒包装×')).toBeInTheDocument()
    expect(categoryField.textContent).toContain('2/3')
  })

  test('adds and removes a custom core advantage tag', async () => {
    const user = userEvent.setup()
    render(<App />)

    const advantageField = getField('您觉得自己的核心竞争优势是？')
    await user.click(getButtonByText(advantageField, '其他'))
    const input = screen.getByPlaceholderText('请补充您的优势')
    await user.type(input, '海外仓支持')
    await user.click(getButtonByText(advantageField, '添加'))

    expect(screen.getByText('其他：海外仓支持')).toBeInTheDocument()
    expect(getButtonByText(advantageField, '其他')).toBeUndefined()

    await user.click(screen.getByRole('button', { name: '删除自定义优势' }))

    expect(screen.queryByText('其他：海外仓支持')).not.toBeInTheDocument()
    expect(getButtonByText(advantageField, '其他')).toBeInTheDocument()
  })

  test('shows step 2 summary using export experience and custom advantage input', async () => {
    const user = userEvent.setup()
    render(<App />)

    await fillBaseRequiredFields(user)
    const exportField = getField('是否已有出口经验？')
    const advantageField = getField('您觉得自己的核心竞争优势是？')

    await user.click(getButtonByText(exportField, '有'))
    const currentMarketField = (await screen.findByText('当前主要销售市场', { selector: 'span' })).closest('label')
    await user.click(getButtonByText(currentMarketField, '北美'))
    await user.click(getButtonByText(advantageField, '其他'))
    await user.type(screen.getByPlaceholderText('请补充您的优势'), '海外仓支持')
    await user.click(getButtonByText(advantageField, '添加'))
    await user.click(screen.getByRole('button', { name: '生成建议结果' }))

    expect(await screen.findByText('第 2 步：推荐市场与定位建议')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /查看本次建议的判断依据/ }))
    expect(screen.getByText(/现有市场基础：北美/)).toBeInTheDocument()
    expect(screen.getByText(/目标客户与优势：品牌商 \/ 价格有优势 \/ 海外仓支持/)).toBeInTheDocument()
    expect(screen.getByText(/主推品类建议：纸制品/)).toBeInTheDocument()
  })

  test('blocks step 3 manual market path when custom country is missing', async () => {
    const user = userEvent.setup()
    render(<App />)

    await goToStep2WithRequiredInputs(user, { exportExperience: 'none' })
    await user.click(screen.getByRole('button', { name: '确认并进入下一步' }))

    expect(await screen.findByText('第 3 步：客户意向确认')).toBeInTheDocument()
    await user.click(screen.getByText('手动指定目标市场').closest('button'))
    await user.clear(screen.getByPlaceholderText('例如：加拿大'))
    await user.click(screen.getByRole('button', { name: '确认市场并继续' }))

    expect(await screen.findByText('请填写目标国家/市场。')).toBeInTheDocument()
    expect(screen.getByText('第 3 步：客户意向确认')).toBeInTheDocument()
  })

  test('prevents material generation when step 5 products are incomplete', async () => {
    const user = userEvent.setup()
    render(<App />)

    await goToStep5(user)
    await user.click(screen.getByRole('button', { name: '生成网站预览' }))

    expect(await screen.findByText('请至少填写 3 个产品。')).toBeInTheDocument()
    expect(screen.queryByText('One-page Marketing Site Preview (US)')).not.toBeInTheDocument()
  })
})
