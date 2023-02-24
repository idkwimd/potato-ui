import Component from './Component.js'

export default class
{
    constructor (el, attr)
    {
        this.el = el
        this.attr = attr
    }

    async update (html, targetEl, type = 'append')
    {
        if (typeof targetEl === 'string')
        {
            targetEl = this.el.querySelector(targetEl)
        }

        let htmlTemplate = document.createElement('template')
            htmlTemplate.innerHTML = html

        for (const x of htmlTemplate.content.querySelectorAll('[data-w]'))
        {
            await new Component({
                component: x.dataset.w,
                type: 'widget',
                placeholderEl: x
            }).parse()
        }

        if (type === 'append')
        {
            targetEl.append(htmlTemplate.content)
        }

        if (type === 'prepend')
        {
            targetEl.prepend(htmlTemplate.content)
        }

        if (type === 'before')
        {
            targetEl.before(htmlTemplate.content)
        }

        if (type === 'after')
        {
            targetEl.after(htmlTemplate.content)
        }

        if (type === 'replace')
        {
            targetEl.replaceWith(htmlTemplate.content)
        }
    }

    selectAll (selector)
    {
        const matches = this.el.querySelectorAll(selector)
        const elements = Array.from(matches)
        return elements.filter(el => el.hasAttribute(this.attr))
    }

    select (selector)
    {
        return this.selectAll(selector)[0] || null
    }
}