/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  /**Vue实例化最先执行的方法 */  
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    /**一个累加的id用来区分每个实例 */
    vm._uid = uid++

    /**做性能监测的可以忽略 */
    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    /**一个标识防止自身被观测 */
    vm._isVue = true
    // merge options
    /**
     * 将我们传入的options与一些全局的默认options合并
     * 最终定义一个$options属性来存放这些属性
     * 组件型的Vue实例
     */
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      /**不是组件型的走这里合并全局的一些配置 */
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    /**初始化声明周期 */
    initLifecycle(vm)
    /**初始化事件 */
    initEvents(vm)
    /**初始化渲染相关 */
    initRender(vm)
    /**调用beforeCreate生命周期hook */
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    /**初始化所有的state包括data，props，method等，在这个方法后才能获取data */
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    /**调用create生命周期hook */
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    /**如果传入检查到了el属性就执行挂载方法 */
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

/**组件型的Vue合并options方法 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  /**先获取Vue全局的options，在initGlobal中定义的 */
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  /**获取当前vm实例的父Vnode */
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

/**利用Vue初始化的直接返回 */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  /**自定义组件继承来的走 */
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      /**更新当前的superOptions */
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      /**更新当前的组件的options */
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      /**重新合并配置 */
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
