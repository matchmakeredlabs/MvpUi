import config from './config.js';
import bsesson from './bsession.js';
import bdoc from './bdoc.js';

const sesson = new bsession(config.backEndUrl);

async function loadCollections() {
    let response = await session.fetch("/api/collections");
    let data = await response.json();

    const list = document.getElementById("mmx_collections");
    for (const collection of data.collections) {
        list.append(bdoc.ele("li",
            bdoc.ele("a", bdoc.attr("href", "Browse2?id=" + collection.id),
            collection.name)));

        console.log(JSON.stringify(collection));
    }
}

loadCollections();
