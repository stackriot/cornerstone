import FacetedSearch from '../../../theme/common/faceted-search';
import { Validators } from '../../../theme/common/form-utils';
import $ from 'jquery';
import { hooks, api } from 'bigcommerce/stencil-utils';
import History from 'browserstate/history.js/scripts/bundled-uncompressed/html4+html5/jquery.history';

describe('FacetedSearch', () => {
    let facetedSearch;
    let requestOptions;
    let onSearchSuccess;
    let html;
    let $element;

    beforeEach(() => {
        onSearchSuccess = jasmine.createSpy('onSearchSuccess');

        requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
        };

        html =
            '<div id="facetedSearch">' +
                '<a class="facetedSearch-clearLink">Clear</a>' +
                '<div id="facetedSearch-navList">' +
                    '<ul class="navList" id="facet-brands" data-count="2">' +
                        '<li><a href="?brand=item1">Facet Item 1</a></li>' +
                        '<li><a href="?brand=item2">Facet Item 2</a></li>' +
                        '<li><a href="?brand=item3">Facet Item 3</a></li>' +
                        '<li><a href="?brand=item4">Facet Item 4</a></li>' +
                    '</ul>' +
                    '<form id="facet-sort">' +
                        '<select name="sort">' +
                            '<option value="featured">Featured</option>' +
                            '<option value="newest">Newest</option>' +
                        '</select>' +
                    '</form>' +
                    '<form id="facet-range-form">' +
                        '<input name="min_price" value="0">' +
                        '<input name="max_price" value="100">' +
                    '</form>' +
                '</div>' +
            '</div>';

        $element = $(html);
        $element.appendTo(document.body);

        facetedSearch = new FacetedSearch(requestOptions, onSearchSuccess);
    });

    afterEach(() => {
        facetedSearch.unbindEvents();

        $element.remove();
    });

    describe('refreshView', () => {
        let content;

        beforeEach(() => {
            content = { html: '<div>Results</div>' };

            spyOn(facetedSearch, 'restoreCollapsedFacets');
            spyOn(facetedSearch, 'restoreCollapsedFacetItems');
            spyOn(Validators, 'setMinMaxPriceValidation');
        });

        it('should update view with content by firing registered callback', () => {
            facetedSearch.refreshView(content);

            expect(onSearchSuccess).toHaveBeenCalledWith(content);
        });

        it('should restore all collapsed facets', () => {
            facetedSearch.refreshView(content);

            expect(facetedSearch.restoreCollapsedFacets).toHaveBeenCalled();
        });

        it('should restore all collapsed facet items', () => {
            facetedSearch.refreshView(content);

            expect(facetedSearch.restoreCollapsedFacetItems).toHaveBeenCalled();
        });

        it('should re-init price range validator', function() {
            facetedSearch.refreshView(content);

            expect(Validators.setMinMaxPriceValidation).toHaveBeenCalledWith(facetedSearch.priceRangeValidator, jasmine.any(Object));
        });
    });

    describe('updateView', () => {
        let content;
        let state;

        beforeEach(() => {
            spyOn(api, 'getPage');
            spyOn(History, 'getState');
            spyOn(facetedSearch, 'refreshView');

            state = {
                url: 'http://url.com/slug',
            };

            content = {};

            History.getState.and.returnValue(state);
        });

        it('should fetch content from remote server', function() {
            facetedSearch.updateView();

            expect(api.getPage).toHaveBeenCalledWith(state.url, requestOptions, jasmine.any(Function));
        });

        it('should refresh view', function() {
            api.getPage.and.callFake(function(url, options, callback) {
                callback(null, content);
            });

            facetedSearch.updateView();

            expect(facetedSearch.refreshView).toHaveBeenCalled();
        });
    });

    describe('expandFacetItems', () => {
        it('should remove from `collapsedFacetItems`', function() {
            facetedSearch.collapsedFacetItems = ['facet-brands'];
            facetedSearch.expandFacetItems($('#facet-brands'));

            expect(facetedSearch.collapsedFacetItems).not.toContain('facet-brands');
        });
    });

    describe('collapseFacetItems', () => {
        it('should add to `collapsedFacetItems`', function() {
            facetedSearch.collapseFacetItems($('#facet-brands'));

            expect(facetedSearch.collapsedFacetItems).toContain('facet-brands');
        });
    });

    describe('toggleFacetItems', () => {
        let $navList;

        beforeEach(() => {
            spyOn(facetedSearch, 'expandFacetItems');
            spyOn(facetedSearch, 'collapseFacetItems');

            $navList = $('#facet-brands');
        });

        it('should expand facet items if they are collapsed', function() {
            facetedSearch.collapsedFacetItems = ['facet-brands'];
            facetedSearch.toggleFacetItems($navList);

            expect(facetedSearch.expandFacetItems).toHaveBeenCalledWith($navList);
        });

        it('should collapse facet items if they are expaned', function() {
            facetedSearch.collapsedFacetItems = [];
            facetedSearch.toggleFacetItems($navList);

            expect(facetedSearch.collapseFacetItems).toHaveBeenCalledWith($navList);
        });
    });

    describe('when location URL is changed', () => {
        let title;
        let href;

        beforeEach(() => {
            title = document.title;
            href = document.location.href;

            spyOn(facetedSearch, 'updateView');
        });

        afterEach(() => {
            History.pushState({}, title, href);
        });

        it('should update view', () => {
            History.pushState({}, 'Hello World', '/hello-world');

            expect(facetedSearch.updateView).toHaveBeenCalled();
        });
    });

    describe('when price range form is submitted', () => {
        let event;
        let eventName;

        beforeEach(() => {
            eventName = 'facetedSearch-range-submitted';
            event = {
                currentTarget: '#facet-range-form',
                preventDefault: jasmine.createSpy('preventDefault'),
            };

            spyOn(History, 'pushState');
            spyOn(facetedSearch.priceRangeValidator, 'areAll').and.returnValue(true);
        });

        it('should set `min_price` and `max_price` query param to corresponding form values if form is valid', () => {
            hooks.emit(eventName, event);

            expect(History.pushState).toHaveBeenCalledWith({}, '', '/context.html?min_price=0&max_price=100');
        });

        it('should not set `min_price` and `max_price` query param to corresponding form values if form is invalid', () => {
            facetedSearch.priceRangeValidator.areAll.and.returnValue(false);
            hooks.emit(eventName, event);

            expect(History.pushState).not.toHaveBeenCalledWith({}, '', '/context.html?min_price=0&max_price=100');
        });

        it('should prevent default event', function() {
            hooks.emit(eventName, event);

            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('when sort filter is submitted', () => {
        let event;
        let eventName;

        beforeEach(() => {
            eventName = 'sortBy-submitted';
            event = {
                currentTarget: '#facet-sort',
                preventDefault: jasmine.createSpy('preventDefault'),
            };

            spyOn(History, 'pushState');
        });

        it('should set `sort` query param to the value of selected option', () => {
            hooks.emit(eventName, event);

            expect(History.pushState).toHaveBeenCalledWith({}, '', '/context.html?sort=featured');
        });

        it('should prevent default event', function() {
            hooks.emit(eventName, event);

            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('when a facet is clicked', () => {
        let event;
        let eventName;

        beforeEach(() => {
            eventName = 'facetedSearch-facet-clicked';
            event = {
                currentTarget: '[href="?brand=item1"]',
                preventDefault: jasmine.createSpy('preventDefault'),
            };

            spyOn(History, 'pushState');
        });

        it('should change the URL of window to the URL of facet item', () => {
            hooks.emit(eventName, event);

            expect(History.pushState).toHaveBeenCalledWith({}, '', '?brand=item1');
        });

        it('should prevent default event', function() {
            hooks.emit(eventName, event);

            expect(event.preventDefault).toHaveBeenCalled();
        });
    });
});
