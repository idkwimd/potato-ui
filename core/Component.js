export default class Component
{
    constructor (options = {})
    {
        this.options = options

        this.typeDirMap = {
            'view': { dir: '../views', attrPrefix: 'v-' },
            'widget': { dir: '../widgets', attrPrefix: 'w-' }
        }
    }

    async parse()
    {
        const { dir:moduleDir, attrPrefix } = this.typeDirMap[this.options.type || 'view']
        const templateEl = document.createElement('template')
        const component = await import(`${moduleDir}/${this.options.component}.js`)

        if (!component.html)
        {
            throw new Error(`Component "${this.options.component}" does not define any HTML`)
        }

        if (!component.name)
        {
            throw new Error(`Component "${this.options.component}" does not have a name`)
        }

        if (typeof component.guard === 'function')
        {
            let res = component.guard.call(component)

            if (res instanceof Promise)
            {
                res = await res
            }

            if (typeof res === 'string')
            {
                return res
            }
        }
        
        templateEl.innerHTML = component.html

        if (templateEl.content.childElementCount > 1)
        {
            console.warn(`
                Component "${this.options.component}" has multiple root element.
                Only first one is used`)
        }

        const rootEl = templateEl.content.firstElementChild
        const attrName = attrPrefix + component.name
        const rootAttrName = attrName + '-root'

        rootEl.setAttribute(rootAttrName, '')

        ;[rootEl, ...rootEl.querySelectorAll('*')].forEach(el =>
        {
            el.setAttribute(attrName, '')
        })

        // Generate Global CSS
        // =================================================
        //
        if (component.globalCSS)
        {
            if (document.head.querySelector(`style[data-global-comp="${attrName}"]`) == null)
            {
                const styleEl = document.createElement('style')
                    styleEl.textContent = component.globalCSS
                    styleEl.dataset.globalComp = attrName

                document.head.appendChild(styleEl)
            }
        }

        // Generate CSS
        // =================================================
        //
        if (component.css)
        {
            if (document.head.querySelector(`style[data-comp="${attrName}"]`) == null)
            {
                let css = component.css.replace(/([^\s:]+)((?::.+)?\s*(?:,|{[^\{\}]*}))/g, `$1[${attrName}]$2`)
                    css = css.replace(/:root/g, `[${rootAttrName}]`)

                const styleEl = document.createElement('style')
                      styleEl.textContent = css
                      styleEl.dataset.comp = attrName

                document.head.appendChild(styleEl)
            }
        }

        // Replace named slots
        // =================================================
        //
        for (const slotEl of rootEl.querySelectorAll('[data-s]:not([data-s=""])'))
        {
            const name = slotEl.dataset.s
            const templateEl = this.options.placeholderEl.querySelector(`template[name="${name}"]`)

            if (!templateEl)
            {
                templateEl.remove(); continue
            }

            slotEl.replaceWith(templateEl.content)
            templateEl.remove()
        }

        // Replace default slot
        // =================================================
        //
        const defaultSlot = rootEl.querySelector('[data-s=""]')

        if (defaultSlot)
        {
            const content = this.options.placeholderEl.innerHTML
            const templateEl = document.createElement('template')

            templateEl.innerHTML = content
            defaultSlot.replaceWith(templateEl.content)
        }
        
        // Render nested widgets
        // =================================================
        //
        const nestedWidgets = Array
                .from(rootEl.querySelectorAll('[data-w]'))
                .reverse()

        for (const wEl of nestedWidgets)
        {
            await new Component({
                component: wEl.dataset.w,
                type: 'widget',
                placeholderEl: wEl
            }).parse()
        }

        // Inherit attributes
        // =================================================
        //
        const placeholderAttrs = this.options.placeholderEl.attributes
        const reservedAttrs = ['data-r', 'data-w']

        for (const attr of placeholderAttrs)
        {
            if (reservedAttrs.includes(attr.name))
            {
                continue
            }

            if (attr.name === 'class')
            {
                rootEl.className += (' ' + this.options.placeholderEl.className.trim()).trim()
                continue
            }
            
            rootEl.setAttribute(attr.name, attr.value)
        }

        if (this.options.attrs)
        {
            for (const [key, value] of Object.entries(this.options.attrs))
            {
                rootEl.setAttribute(key, value)
            }
        }

        // Replace placeholder with the generated component
        // =================================================
        //
        this.options.placeholderEl.replaceWith(rootEl)

        // Run script (if any)
        // =================================================
        //
        if (component.Script)
        {
            const scriptClass = new component.Script(rootEl, attrName)

            if (typeof scriptClass.init === 'function')
            {
                const initFn = scriptClass.init()

                if (initFn instanceof Promise)
                {
                    await initFn
                }
            }
        }

        return rootEl
    }
}