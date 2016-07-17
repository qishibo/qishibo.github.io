
function getQuery(name)
{
     var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
     var r = window.location.search.substr(1).match(reg);

     if(r != null) return  unescape(r[2]); return null;
}

$(function(){
    var expert_tag = getQuery('tag');

    if ( pre_tags = qii_global_tags[expert_tag]) {
        var template = $('#qii-tags-template').html();
        template = Mustache.render(template, {'post_list': pre_tags});
    }

    else {
        var template = $('#qii-no-tags-template').html();
        template = Mustache.render(template, {'tag': expert_tag});
    }

    // console.log(template);

    $('.qii-post-content').html(template);
});
