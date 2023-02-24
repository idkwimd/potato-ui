import Component from './Component.js'

export default class
{
    constructor (routes)
    {
        this.routes = routes
    }

    /**
     * Handle for hash change event
     * @private
     * @returns {Promise<void>}
     */
    async _onHashChange ()
    {
        const path = window.location.hash.substring(1)

        if (!path)
        {
            window.location.hash = '/'; return
        }

        const matchedRoute = this.routes.find(e => e.path === path)

        if (!matchedRoute)
        {
            throw new Error(`No route found for path "${path}"`)
        }

        let progressivePaths = this._progressivePaths(matchedRoute.path)
        let currRoot = document.body

        //
        window.dispatchEvent(new CustomEvent('before-view-load', { detail: path }))

        //
        for (const [currPathIndex, currPath] of progressivePaths.entries())
        {
            const currRoute = this.routes.find(e => e.path === currPath)
            const matchedRouteEl = currRoot.querySelector('[data-r]')
            
            if (currPathIndex < progressivePaths.length - 1)
            {
                if (matchedRouteEl.dataset.route === currPath)
                {
                    currRoot = matchedRouteEl; continue
                }
            }

            const view = new Component({
                component: currRoute.view,
                type: 'view',
                placeholderEl: matchedRouteEl,
                attrs: {
                    'data-r': currPath
                }
            })

            currRoot = await view.parse()

            if (typeof currRoot === 'string')
            {
                window.location.hash = currRoot; return
            }
        }

        window.dispatchEvent(new CustomEvent('view-loaded', { detail: path }))
    }

    /**
     * Initialize router
     * @public
     * @returns {Promise<void>}
     */
    async init ()
    {
        //
        window.addEventListener('hashchange', this._onHashChange.bind(this))
        
        //
        await this._onHashChange()
    }

    /**
     * Converts a string to array of progressive paths.
     * Eg: "/root/user/3" to ['/', '/root', '/root/user', '/root/user/3']
     * @private
     * @param {string} path 
     * @returns {string[]}
     */
    _progressivePaths (path)
    {
        path = path.replace(/^\/|\/$/g, '')

        return path.split('/').reduce((result, cp) => 
        {
            if (cp === '')
            {
                return result
            }

            result.push((result[result.length - 1] + '/' + cp).replace('//', '/'))

            return result
        }, 
        ['/'])
    }
}