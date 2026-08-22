import { isValidElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Module, toValue } from '@caeus/wyr'
import { defaultModule, wire } from './wire'

describe('UI wiring', () => {
  it('renders through an injected module', async () => {
    const render = vi.fn()
    const App = () => null
    const module = () => Module({
      App: toValue(App),
      root: toValue({ render })
    })

    await wire(window, module)

    expect(render).toHaveBeenCalledOnce()
    expect(isValidElement(render.mock.calls[0]![0])).toBe(true)
  })

  it('builds the default module from the supplied environment', () => {
    document.body.innerHTML = '<div id="app"></div>'
    const emptyDocument = document.implementation.createHTMLDocument()

    expect(() => defaultModule({ document: emptyDocument })).toThrow('Mount node not found')
  })
})
